import { BadRequestException } from "@nestjs/common";

import { LytexSubcontasService } from "../lytex-subcontas.service";

import type { LytexClientService } from "../lytex-client.service";
import type { CompanyPaymentAccount } from "@prisma/client";

function buildConta(overrides: Partial<CompanyPaymentAccount> = {}): CompanyPaymentAccount {
  return {
    id: "conta-1",
    companyId: "company-1",
    status: "ATIVA",
    lytexSubAccountId: "sub_1",
    lytexRecipientId: "rec_1",
    lytexSplitLiberado: true,
    emissorDaCobranca: "ROTTA",
    taxaDaPlataformaBps: 0,
    taxaPixBps: 129,
    taxaBoletoBps: 129,
    taxaCreditoVistaBps: 99,
    taxaCreditoParceladoBps: 49,
    ...overrides,
  } as CompanyPaymentAccount;
}

const dadosDoCadastro = {
  razaoSocial: "Transportes Lima LTDA",
  nomeFantasia: "Transportes Lima",
  cpfCnpj: "12.345.678/0001-90",
  tipo: "LTDA" as const,
  email: "contato@lima.com.br",
  telefone: "(21) 99999-0000",
  endereco: "Avenida Roberto Silveira",
  numero: "1180",
  bairro: "Centro",
  cidade: "Niteroi",
  uf: "rj",
  cep: "24900-000",
  faturamentoMensalCentavos: 450_000,
};

describe("LytexSubcontasService", () => {
  let client: jest.Mocked<LytexClientService>;
  let service: LytexSubcontasService;

  beforeEach(() => {
    client = {
      createSubAccount: jest.fn().mockResolvedValue({
        _id: "sub_novo",
        _recipientId: "rec_novo",
        status: "active",
        splitAutorization: false,
      }),
      getSubAccount: jest.fn(),
    } as unknown as jest.Mocked<LytexClientService>;
    service = new LytexSubcontasService(client);
  });

  describe("criarSubconta", () => {
    it("manda o cadastro limpo, com o documento e o telefone so em digitos", async () => {
      await service.criarSubconta(dadosDoCadastro);

      expect(client.createSubAccount).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "pj",
          name: "Transportes Lima LTDA",
          fantasyName: "Transportes Lima",
          cpfCnpj: "12345678000190",
          cellphone: "21999990000",
          companyType: "ltda",
          address: expect.objectContaining({ zip: "24900000", state: "RJ" }),
        }),
      );
    });

    /*
      O transportador autonomo e pessoa fisica de verdade. Mandar `pj`
      faria o KYC bater contra um documento que nao e de empresa, e
      `companyType` em CPF nao faz sentido nenhum: o campo existe para
      natureza juridica.
    */
    it("CPF entra como pessoa fisica, sem companyType", async () => {
      await service.criarSubconta({
        ...dadosDoCadastro,
        cpfCnpj: "123.456.789-09",
        tipo: "AUTONOMO",
      });

      const [corpo] = client.createSubAccount.mock.calls[0];
      expect(corpo.type).toBe("pf");
      expect(corpo.companyType).toBeUndefined();
    });

    /*
      O esquema da Lytex marca `cpfCnpj` como opcional, mas o suporte
      confirmou em 22/10/2026 que o KYC nao libera a subconta sem ele.
      Uma subconta criada sem documento ficaria parada sem que ninguem
      soubesse por que.
    */
    it("recusa antes de chamar a Lytex quando falta o documento", async () => {
      await expect(service.criarSubconta({ ...dadosDoCadastro, cpfCnpj: "" })).rejects.toThrow(
        BadRequestException,
      );

      expect(client.createSubAccount).not.toHaveBeenCalled();
    });
  });

  describe("sincronizar", () => {
    /*
      `status: "active"` diz que a conta existe e nao esta bloqueada.
      `splitAutorization` diz que ela pode dividir. Ativa SEM split
      recebe cobranca e nao repassa a taxa da Rotta: marca-la como ATIVA
      mostraria na tela um recebimento que funciona pela metade.
    */
    it("ativa so quando o split ja foi liberado", async () => {
      client.getSubAccount.mockResolvedValue({
        _id: "sub_1",
        _recipientId: "rec_1",
        status: "active",
        splitAutorization: true,
      });

      await expect(service.sincronizar("sub_1")).resolves.toEqual({
        status: "ATIVA",
        recipientId: "rec_1",
        splitLiberado: true,
      });
    });

    it("ativa sem split liberado continua EM_ANALISE: o KYC ainda corre", async () => {
      client.getSubAccount.mockResolvedValue({
        _id: "sub_1",
        status: "active",
        splitAutorization: false,
      });

      await expect(service.sincronizar("sub_1")).resolves.toEqual(
        expect.objectContaining({ status: "EM_ANALISE", splitLiberado: false }),
      );
    });

    it("bloqueada vira RECUSADA", async () => {
      client.getSubAccount.mockResolvedValue({ _id: "sub_1", status: "blocked" });

      await expect(service.sincronizar("sub_1")).resolves.toEqual(
        expect.objectContaining({ status: "RECUSADA" }),
      );
    });

    /* A Lytex acrescenta estado sem avisar, e mudar o estado de uma
       conta de recebimento por um nome que ninguem leu e pior do que
       nao mudar. */
    it("status desconhecido mantem EM_ANALISE", async () => {
      client.getSubAccount.mockResolvedValue({
        _id: "sub_1",
        status: "nunca_visto" as never,
      });

      await expect(service.sincronizar("sub_1")).resolves.toEqual(
        expect.objectContaining({ status: "EM_ANALISE" }),
      );
    });
  });

  describe("montarSplit", () => {
    /*
      O sentido do split se inverte conforme quem emitiu, e errar isso
      significaria mandar 98,71% para quem JA TEM o dinheiro e ficar com
      1,29% de nada.
    */
    it("emitido pela subconta: o split e a taxa da Rotta", () => {
      const split = service.montarSplit(buildConta(), "PIX", "SUBCONTA", "rec_da_rotta");

      expect(split).toEqual({
        type: "percentage",
        recipients: [expect.objectContaining({ _recipientId: "rec_da_rotta", value: 1.29 })],
      });
    });

    it("emitido pela Rotta: o split e o que sobra para a transportadora", () => {
      const split = service.montarSplit(buildConta(), "PIX", "ROTTA", "rec_da_rotta");

      expect(split).toEqual({
        type: "percentage",
        recipients: [expect.objectContaining({ _recipientId: "rec_1", value: 98.71 })],
      });
    });

    /* A taxa e por MEIO (tabela do CFO de 18/10): um boleto com o
       percentual do cartao seria um erro invisivel no extrato. */
    it("a taxa sai do meio de pagamento da cobranca", () => {
      const split = service.montarSplit(buildConta(), "CARTAO_CREDITO", "SUBCONTA", "rec_da_rotta");

      expect(split?.recipients[0]?.value).toBe(0.99);
    });

    it("transportadora sem subconta nao tem para quem dividir", () => {
      expect(
        service.montarSplit(
          buildConta({ lytexSubAccountId: null, lytexRecipientId: null }),
          "PIX",
          "ROTTA",
          "rec_da_rotta",
        ),
      ).toBeUndefined();
    });

    /* Mandar `0` criaria uma linha de repasse de zero real no extrato
       dela, todo mes. */
    it("taxa zero com emissor SUBCONTA nao gera split nenhum", () => {
      const conta = buildConta({ taxaPixBps: 0, taxaDaPlataformaBps: 0 });

      expect(service.montarSplit(conta, "PIX", "SUBCONTA", "rec_da_rotta")).toBeUndefined();
    });

    /* Sem o recipient da Rotta nao ha para onde mandar a nossa parte, e
       inventar um destino e pior do que nao reter nada. */
    it("sem LYTEX_ROTTA_RECIPIENT_ID, a cobranca da subconta sai sem split", () => {
      expect(service.montarSplit(buildConta(), "PIX", "SUBCONTA", undefined)).toBeUndefined();
    });

    /* Com taxa zero e emissor ROTTA vai 100%, que e o combinado de hoje
       enquanto a taxa por transportadora nao e ligada. */
    it("taxa zero com emissor ROTTA repassa tudo", () => {
      const conta = buildConta({ taxaPixBps: 0, taxaDaPlataformaBps: 0 });

      expect(service.montarSplit(conta, "PIX", "ROTTA", "rec_da_rotta")?.recipients[0]?.value).toBe(
        100,
      );
    });
  });
});

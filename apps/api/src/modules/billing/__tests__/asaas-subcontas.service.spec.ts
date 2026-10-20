import { BadRequestException } from "@nestjs/common";

import { AsaasSubcontasService } from "../asaas-subcontas.service";

import type { AsaasClientService } from "../asaas-client.service";
import type { SecretCipherService } from "@/infra/security/secret-cipher.service";
import type { CompanyPaymentAccount } from "@prisma/client";

/**
 * O que estes testes guardam é dinheiro indo para o lado errado.
 *
 * `montarSplit` é lido dos dois lados: quando a Rotta emite, o split diz
 * quanto vai para a transportadora; quando a subconta emite, diz quanto
 * vem para a Rotta. Inverter manda o valor inteiro para quem não devia,
 * e isso não aparece em nenhum typecheck.
 */
describe("AsaasSubcontasService", () => {
  let asaasClient: jest.Mocked<AsaasClientService>;
  let secretCipher: jest.Mocked<SecretCipherService>;
  let service: AsaasSubcontasService;

  const contaBase = {
    companyId: "empresa-1",
    asaasWalletId: "wallet-transportadora",
    asaasAccountId: "acc_1",
    asaasApiKeyCifrada: "iv:tag:cifra",
    emissorDaCobranca: "ROTTA",
    taxaDaPlataformaBps: 0,
    taxaPixBps: 129,
    taxaBoletoBps: 129,
    taxaCreditoVistaBps: 99,
    taxaCreditoParceladoBps: 49,
  } as unknown as CompanyPaymentAccount;

  beforeEach(() => {
    asaasClient = {
      createSubaccount: jest.fn(),
      configurarCustodiaDaSubconta: jest.fn(),
    } as unknown as jest.Mocked<AsaasClientService>;

    secretCipher = {
      encrypt: jest.fn().mockReturnValue("cifrado"),
      decrypt: jest.fn().mockReturnValue("chave-em-claro"),
    } as unknown as jest.Mocked<SecretCipherService>;

    service = new AsaasSubcontasService(asaasClient, secretCipher);
  });

  describe("montarSplit", () => {
    it("sem subconta não há split: o valor fica na conta da Rotta", () => {
      expect(service.montarSplit(null, "PIX", "wallet-rotta")).toBeUndefined();
    });

    it("com a Rotta emitindo, a transportadora recebe o que sobra da nossa taxa", () => {
      const split = service.montarSplit(contaBase, "PIX", "wallet-rotta");

      expect(split).toEqual([{ walletId: "wallet-transportadora", percentualValue: 100 - 1.29 }]);
    });

    it("com a subconta emitindo, o split traz a NOSSA taxa para a Rotta", () => {
      const conta = { ...contaBase, emissorDaCobranca: "SUBCONTA" } as CompanyPaymentAccount;

      expect(service.montarSplit(conta, "PIX", "wallet-rotta")).toEqual([
        { walletId: "wallet-rotta", percentualValue: 1.29 },
      ]);
    });

    it("a taxa muda com o meio de pagamento, como a tabela do CFO manda", () => {
      const comoPercentual = (meio: Parameters<typeof service.montarSplit>[1]) =>
        service.montarSplit(
          { ...contaBase, emissorDaCobranca: "SUBCONTA" },
          meio,
          "wallet-rotta",
        )?.[0].percentualValue;

      expect(comoPercentual("PIX")).toBe(1.29);
      expect(comoPercentual("BOLETO")).toBe(1.29);
      expect(comoPercentual("CARTAO_CREDITO")).toBe(0.99);
    });

    /*
      Débito não é oferecido: pela tabela do Asaas ele custa 2,01% de
      saída, contra um teto de mercado de 1,99%. Não existe percentual
      nosso que caiba, então a taxa é zero e não há split para a Rotta.
    */
    it("no débito a Rotta não retém nada", () => {
      const conta = { ...contaBase, emissorDaCobranca: "SUBCONTA" } as CompanyPaymentAccount;

      expect(service.montarSplit(conta, "CARTAO_DEBITO", "wallet-rotta")).toBeUndefined();
    });

    it("com taxa zero e subconta emitindo, não cria linha de repasse de zero real", () => {
      const conta = {
        ...contaBase,
        emissorDaCobranca: "SUBCONTA",
        taxaPixBps: 0,
      } as CompanyPaymentAccount;

      expect(service.montarSplit(conta, "PIX", "wallet-rotta")).toBeUndefined();
    });

    it("sem o walletId da Rotta configurado, a subconta emite sem split em vez de inventar destino", () => {
      const conta = { ...contaBase, emissorDaCobranca: "SUBCONTA" } as CompanyPaymentAccount;

      expect(service.montarSplit(conta, "PIX", undefined)).toBeUndefined();
    });
  });

  describe("chaveDaSubconta", () => {
    it("decifra com a finalidade da subconta, nunca com a chave do MFA", () => {
      expect(service.chaveDaSubconta(contaBase, "teste")).toBe("chave-em-claro");
      expect(secretCipher.decrypt).toHaveBeenCalledWith("iv:tag:cifra", "subconta-asaas");
    });

    it("sem chave guardada, recusa em vez de emitir cobrança órfã", () => {
      const conta = { ...contaBase, asaasApiKeyCifrada: null };

      expect(() => service.chaveDaSubconta(conta, "teste")).toThrow(BadRequestException);
    });
  });

  describe("criarSubconta", () => {
    const dados = {
      nome: "Transportes Andrade",
      email: "contato@exemplo.com.br",
      cpfCnpj: "12345678000190",
      telefone: "21999998888",
      endereco: "Avenida Roberto Silveira",
      numero: "1180",
      bairro: "Centro",
      cep: "24900000",
      faturamentoMensalCentavos: 450000,
    };

    it("cifra a chave que o Asaas devolve, e devolve o que precisa ser gravado", async () => {
      asaasClient.createSubaccount.mockResolvedValue({
        id: "acc_1",
        walletId: "wallet-1",
        apiKey: "chave-crua-do-asaas",
      });

      const resultado = await service.criarSubconta(dados);

      expect(secretCipher.encrypt).toHaveBeenCalledWith("chave-crua-do-asaas", "subconta-asaas");
      expect(resultado).toEqual({
        asaasAccountId: "acc_1",
        asaasWalletId: "wallet-1",
        asaasApiKeyCifrada: "cifrado",
      });
    });

    /*
      Este teste existe por causa de uma contradicao na documentacao do
      Asaas, encontrada em 20/10/2026. O guia de criacao de subconta diz
      em texto que "a resposta contem `apiKey` e `walletId`". O schema da
      referencia da MESMA API nao tem `apiKey` no topo: tem `accessToken`,
      um objeto, com `apiKey` dentro -- e a propria referencia avisa para
      conferir a resposta real antes de confiar.

      Ler so o topo, como o codigo fazia, gravaria `null` em silencio.
      A subconta nasceria sem poder emitir cobranca, sem custodia, e sem
      ninguem saber por que: a chave so e exibida uma vez, e recuperar
      exige liberar na interface web do Asaas um acesso que vale 2 horas.
    */
    it("acha a chave em accessToken.apiKey, que e onde o schema da referencia a poe", async () => {
      asaasClient.createSubaccount.mockResolvedValue({
        id: "acc_1",
        walletId: "wallet-1",
        accessToken: { id: "key_1", apiKey: "chave-aninhada" },
      });

      const resultado = await service.criarSubconta(dados);

      expect(secretCipher.encrypt).toHaveBeenCalledWith("chave-aninhada", "subconta-asaas");
      expect(resultado.asaasApiKeyCifrada).toBe("cifrado");
    });

    it("com as duas formas presentes, a aninhada vence: e a que o schema promete", async () => {
      asaasClient.createSubaccount.mockResolvedValue({
        id: "acc_1",
        walletId: "wallet-1",
        apiKey: "chave-do-topo",
        accessToken: { apiKey: "chave-aninhada" },
      });

      await service.criarSubconta(dados);

      expect(secretCipher.encrypt).toHaveBeenCalledWith("chave-aninhada", "subconta-asaas");
    });

    it("manda companyType quando a transportadora e PJ, e omite quando nao e", async () => {
      asaasClient.createSubaccount.mockResolvedValue({ id: "acc_1", walletId: "w" });

      await service.criarSubconta({ ...dados, companyType: "MEI" });
      expect(asaasClient.createSubaccount).toHaveBeenCalledWith(
        expect.objectContaining({ companyType: "MEI" }),
      );

      await service.criarSubconta(dados);
      expect(asaasClient.createSubaccount).toHaveBeenLastCalledWith(
        expect.objectContaining({ companyType: undefined }),
      );
    });

    it("manda os nove obrigatorios do schema, e nao so o faturamento", async () => {
      asaasClient.createSubaccount.mockResolvedValue({ id: "acc_1", walletId: "w" });

      await service.criarSubconta(dados);

      expect(asaasClient.createSubaccount).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Transportes Andrade",
          email: "contato@exemplo.com.br",
          cpfCnpj: "12345678000190",
          mobilePhone: "21999998888",
          address: "Avenida Roberto Silveira",
          addressNumber: "1180",
          province: "Centro",
          postalCode: "24900000",
          incomeValue: 4500,
        }),
      );
    });

    it("manda o faturamento em reais, que é a unidade da API deles", async () => {
      asaasClient.createSubaccount.mockResolvedValue({ id: "acc_1", walletId: "w" });

      await service.criarSubconta(dados);

      expect(asaasClient.createSubaccount).toHaveBeenCalledWith(
        expect.objectContaining({ incomeValue: 4500 }),
      );
    });

    /*
      Sem `walletId` a subconta não serve para split nenhum, e seguir em
      frente gravaria uma conta inútil. Recusar deixa a falha visível
      agora, com a instrução de conferir antes de tentar de novo: criar
      duas subcontas para a mesma transportadora é pior.
    */
    it("recusa quando o Asaas não devolve o walletId", async () => {
      asaasClient.createSubaccount.mockResolvedValue({ id: "acc_1" } as never);

      await expect(service.criarSubconta(dados)).rejects.toThrow(BadRequestException);
    });

    it("sem apiKey na resposta, segue com a subconta mas sem poder emitir por ela", async () => {
      asaasClient.createSubaccount.mockResolvedValue({ id: "acc_1", walletId: "wallet-1" });

      const resultado = await service.criarSubconta(dados);

      expect(resultado.asaasApiKeyCifrada).toBeNull();
      expect(secretCipher.encrypt).not.toHaveBeenCalled();
    });
  });

  /*
    `sincronizar` existe por causa de um defeito real, encontrado em
    20/10/2026 ao conferir o schema da referencia: `onboardingUrl` NAO
    vem na resposta de `POST /v3/accounts`. O codigo lia um campo que
    nunca existiu, entao o botao "enviar os documentos" nunca aparecia
    para ninguem. O link vive em `GET /v3/myAccount/documents`,
    consultado com a chave DA SUBCONTA.

    A situacao vem junto porque `GET /v3/myAccount/status` e a unica
    forma de a conta sair de "em analise" enquanto os eventos de conta
    nao estiverem marcados no painel do Asaas -- e marcar aquilo e
    tarefa de uma pessoa.
  */
  describe("sincronizar", () => {
    beforeEach(() => {
      asaasClient.listarDocumentosPendentes = jest.fn().mockResolvedValue([]);
      asaasClient.consultarSituacaoDaConta = jest.fn().mockResolvedValue({ id: "st_1" });
    });

    it("consulta os dois endpoints com a chave da SUBCONTA, nunca com a da Rotta", async () => {
      await service.sincronizar(contaBase);

      expect(asaasClient.listarDocumentosPendentes).toHaveBeenCalledWith("chave-em-claro");
      expect(asaasClient.consultarSituacaoDaConta).toHaveBeenCalledWith("chave-em-claro");
    });

    it("acha o link de envio de documentos entre as pendencias", async () => {
      asaasClient.listarDocumentosPendentes = jest.fn().mockResolvedValue([
        { id: "doc_1", type: "IDENTIFICATION" },
        { id: "doc_2", onboardingUrl: "https://asaas.com/onboarding/abc" },
      ]);

      const resultado = await service.sincronizar(contaBase);

      expect(resultado.onboardingUrl).toBe("https://asaas.com/onboarding/abc");
    });

    it("devolve a situacao geral, que e o que decide o estado da conta", async () => {
      asaasClient.consultarSituacaoDaConta = jest
        .fn()
        .mockResolvedValue({ id: "st_1", general: "APPROVED", documentation: "APPROVED" });

      expect((await service.sincronizar(contaBase)).situacaoGeral).toBe("APPROVED");
    });

    /*
      Isto roda na leitura da tela de dinheiro da transportadora. Uma
      indisponibilidade do Asaas, ou uma subconta criada antes do BaaS
      estar ligado, nao pode derrubar a tela: sem resposta, vale o que
      ja estava gravado.
    */
    it("o Asaas fora do ar nao derruba a tela: devolve nulo nos dois", async () => {
      asaasClient.listarDocumentosPendentes = jest.fn().mockRejectedValue(new Error("502"));
      asaasClient.consultarSituacaoDaConta = jest.fn().mockRejectedValue(new Error("502"));

      await expect(service.sincronizar(contaBase)).resolves.toEqual({
        onboardingUrl: null,
        situacaoGeral: null,
      });
    });

    it("um endpoint fora do ar nao perde a resposta do outro", async () => {
      asaasClient.listarDocumentosPendentes = jest.fn().mockRejectedValue(new Error("502"));
      asaasClient.consultarSituacaoDaConta = jest
        .fn()
        .mockResolvedValue({ id: "st_1", general: "APPROVED" });

      await expect(service.sincronizar(contaBase)).resolves.toEqual({
        onboardingUrl: null,
        situacaoGeral: "APPROVED",
      });
    });

    it("sem chave guardada nao chama nada: as duas consultas sao em nome da subconta", async () => {
      const conta = { ...contaBase, asaasApiKeyCifrada: null };

      await expect(service.sincronizar(conta)).resolves.toEqual({
        onboardingUrl: null,
        situacaoGeral: null,
      });
      expect(asaasClient.listarDocumentosPendentes).not.toHaveBeenCalled();
    });
  });

  describe("configurarCustodia", () => {
    it("liga a custódia de UMA subconta, nunca de todas", async () => {
      await service.configurarCustodia(contaBase, {
        ativa: true,
        diasParaLiberar: 30,
        tarifaNaSubconta: false,
      });

      expect(asaasClient.configurarCustodiaDaSubconta).toHaveBeenCalledWith("acc_1", {
        enabled: true,
        daysToExpire: 30,
        isFeePayer: false,
      });
    });

    it("sem subconta criada, recusa", async () => {
      const conta = { ...contaBase, asaasAccountId: null } as CompanyPaymentAccount;

      await expect(
        service.configurarCustodia(conta, { ativa: true, tarifaNaSubconta: false }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});

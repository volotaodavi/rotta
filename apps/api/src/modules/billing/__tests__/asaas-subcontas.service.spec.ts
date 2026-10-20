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
        asaasOnboardingUrl: null,
      });
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

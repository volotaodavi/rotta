import { BadRequestException, NotFoundException } from "@nestjs/common";

import { RecebimentoService } from "../recebimento.service";

import type { AsaasClientService } from "../asaas-client.service";
import type { PrismaService } from "@/infra/database/prisma.service";
import type { SecretCipherService } from "@/infra/security/secret-cipher.service";

/**
 * Recebimento direto da transportadora pelo split da Asaas.
 *
 * ## O que estes testes protegem
 *
 * Dois riscos que não têm desfazer, e um que custa dinheiro parado.
 *
 * 1. **Subconta duplicada.** A Asaas não permite apagar subconta. Se o
 *    app chamar duas vezes (toque duplo, retentativa de rede), a
 *    segunda não pode criar outra.
 * 2. **`apiKey` perdida.** A Asaas devolve a chave da subconta UMA
 *    ÚNICA VEZ e não permite recuperá-la. Ela tem que ser gravada,
 *    cifrada, na mesma operação da criação.
 * 3. **Dinheiro parado por excesso de zelo.** A Asaas libera o
 *    recebimento ANTES de concluir a análise documental, que leva até
 *    48 horas. Exigir `APPROVED` para deixar receber seguraria o
 *    dinheiro da transportadora sem motivo.
 */

function empresa(extra: Record<string, unknown> = {}) {
  return {
    id: "company-1",
    nomeFantasia: "Van da Dona Maria",
    cpfCnpj: "12345678000190",
    email: "maria@exemplo.com",
    telefone: "21999990000",
    whatsapp: null,
    cep: "24910015",
    endereco: "Rua Saquarema",
    numero: "22",
    bairro: "Caxito",
    asaasWalletId: null,
    asaasSubaccountId: null,
    asaasSubaccountApiKey: null,
    asaasOnboardingStatus: null,
    ...extra,
  };
}

describe("RecebimentoService", () => {
  let service: RecebimentoService;
  let findUnique: jest.Mock;
  let update: jest.Mock;
  let createSubaccount: jest.Mock;
  let getSubaccountStatus: jest.Mock;

  beforeEach(() => {
    findUnique = jest.fn();
    update = jest.fn().mockResolvedValue({});
    createSubaccount = jest.fn();
    getSubaccountStatus = jest.fn();

    const prisma = {
      company: { findUnique, update },
      runWithTenantContext: <T>(_ctx: unknown, fn: () => Promise<T>) => fn(),
    } as unknown as PrismaService;

    const asaas = { createSubaccount, getSubaccountStatus } as unknown as AsaasClientService;
    const cipher = {
      encrypt: (v: string) => `cifrado(${v})`,
      decrypt: (v: string) => v.replace(/^cifrado\(|\)$/g, ""),
    } as unknown as SecretCipherService;

    service = new RecebimentoService(prisma, asaas, cipher);
  });

  describe("habilitar", () => {
    it("cria a subconta e guarda carteira, id e chave CIFRADA", async () => {
      findUnique.mockResolvedValueOnce(empresa()).mockResolvedValueOnce(
        empresa({
          asaasWalletId: "wal_1",
          asaasSubaccountApiKey: null,
          asaasOnboardingStatus: "PENDING",
        }),
      );
      createSubaccount.mockResolvedValue({
        id: "acc_1",
        walletId: "wal_1",
        apiKey: "$aact_chave_da_subconta",
      });

      const situacao = await service.habilitar("company-1");

      expect(createSubaccount).toHaveBeenCalledWith(
        expect.objectContaining({ cpfCnpj: "12345678000190", postalCode: "24910015" }),
      );
      expect(update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "company-1" },
          data: expect.objectContaining({
            asaasWalletId: "wal_1",
            asaasSubaccountId: "acc_1",
            /* Nunca em texto puro: é credencial de terceiro. */
            asaasSubaccountApiKey: "cifrado($aact_chave_da_subconta)",
          }),
        }),
      );
      expect(situacao.habilitado).toBe(true);
    });

    it("NÃO cria outra subconta quando já existe", async () => {
      /*
        O risco real: a Asaas não permite apagar subconta. Um toque duplo
        no app deixaria a transportadora com duas, e metade do dinheiro
        caindo na errada.
      */
      findUnique.mockResolvedValue(
        empresa({ asaasWalletId: "wal_1", asaasOnboardingStatus: "APPROVED" }),
      );

      const situacao = await service.habilitar("company-1");

      expect(createSubaccount).not.toHaveBeenCalled();
      expect(situacao).toEqual({ habilitado: true, situacao: "APPROVED", podeReceber: true });
    });

    it("recusa com mensagem útil quando falta dado do cadastro", async () => {
      /*
        A Asaas recusaria do mesmo jeito, com uma mensagem genérica dela.
        Aqui a transportadora descobre que o problema é o cadastro DELA.
      */
      findUnique.mockResolvedValue(empresa({ cep: null }));

      await expect(service.habilitar("company-1")).rejects.toBeInstanceOf(BadRequestException);
      expect(createSubaccount).not.toHaveBeenCalled();
    });

    it("não derruba a habilitação quando a Asaas não devolve apiKey", async () => {
      /*
        Sem a chave, o split continua funcionando (ele só precisa do
        `walletId`); o que se perde é consultar o onboarding em nome
        dela. Perder a consulta não justifica recusar o recebimento.
      */
      findUnique
        .mockResolvedValueOnce(empresa())
        .mockResolvedValueOnce(empresa({ asaasWalletId: "wal_1" }));
      createSubaccount.mockResolvedValue({ id: "acc_1", walletId: "wal_1" });

      const situacao = await service.habilitar("company-1");

      expect(situacao.habilitado).toBe(true);
      expect(update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ asaasSubaccountApiKey: null }),
        }),
      );
    });

    it("lança quando a transportadora não existe", async () => {
      findUnique.mockResolvedValue(null);
      await expect(service.habilitar("nao-existe")).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe("consultar", () => {
    it("diz que ainda não está habilitado quando não há carteira", async () => {
      findUnique.mockResolvedValue(empresa());

      expect(await service.consultar("company-1")).toEqual({
        habilitado: false,
        situacao: null,
        podeReceber: false,
      });
    });

    it("deixa receber mesmo com a análise ainda pendente", async () => {
      /*
        A Asaas leva até 48 horas para aprovar a documentação e libera o
        recebimento antes disso. Exigir APPROVED seguraria o dinheiro da
        transportadora à toa.
      */
      findUnique.mockResolvedValue(
        empresa({
          asaasWalletId: "wal_1",
          asaasSubaccountApiKey: "cifrado(chave)",
          asaasOnboardingStatus: "PENDING",
        }),
      );
      getSubaccountStatus.mockResolvedValue({ general: "AWAITING_APPROVAL" });

      const situacao = await service.consultar("company-1");

      expect(situacao.podeReceber).toBe(true);
      expect(situacao.situacao).toBe("AWAITING_APPROVAL");
    });

    it("grava a situação nova quando ela muda", async () => {
      findUnique.mockResolvedValue(
        empresa({
          asaasWalletId: "wal_1",
          asaasSubaccountApiKey: "cifrado(chave)",
          asaasOnboardingStatus: "PENDING",
        }),
      );
      getSubaccountStatus.mockResolvedValue({ general: "APPROVED" });

      await service.consultar("company-1");

      expect(update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { asaasOnboardingStatus: "APPROVED" } }),
      );
    });

    it("nunca vira tela de erro quando a Asaas está fora do ar", async () => {
      /*
        Esta aba é onde a transportadora vê o próprio dinheiro. Uma
        consulta de status indisponível não pode transformá-la em erro:
        devolve o último estado conhecido.
      */
      findUnique.mockResolvedValue(
        empresa({
          asaasWalletId: "wal_1",
          asaasSubaccountApiKey: "cifrado(chave)",
          asaasOnboardingStatus: "APPROVED",
        }),
      );
      getSubaccountStatus.mockRejectedValue(new Error("Asaas fora do ar"));

      const situacao = await service.consultar("company-1");

      expect(situacao).toEqual({ habilitado: true, situacao: "APPROVED", podeReceber: true });
    });
  });
});

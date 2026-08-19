import { BadRequestException, NotFoundException } from "@nestjs/common";
import { CompanyStatus } from "@prisma/client";

import { ROTTA_SUBSCRIPTION_PRODUCT_EXTERNAL_ID } from "../billing.constants";
import { BillingService } from "../billing.service";

import type { AbacatePayClientService } from "../abacatepay-client.service";
import type { PrismaService } from "@/infra/database/prisma.service";
import type { CompanyWithPlan } from "@/modules/companies/repositories/company.repository";

function buildCompany(): CompanyWithPlan {
  return {
    id: "company-1",
    nomeFantasia: "Transportadora Exemplo",
    status: CompanyStatus.TRIAL,
    abacatepaySubscriptionId: null,
  } as CompanyWithPlan;
}

describe("BillingService", () => {
  let client: jest.Mocked<AbacatePayClientService>;
  let companyRepository: { findById: jest.Mock; update: jest.Mock; list: jest.Mock };
  let prisma: { runWithTenantContext: jest.Mock };
  let service: BillingService;

  beforeEach(() => {
    client = {
      isConfigured: jest.fn().mockReturnValue(true),
      listProducts: jest.fn(),
      createProduct: jest.fn(),
      createSubscriptionCheckout: jest.fn(),
      createPixQrCode: jest.fn(),
      checkPixQrCodeStatus: jest.fn(),
      listBillings: jest.fn(),
    } as unknown as jest.Mocked<AbacatePayClientService>;

    companyRepository = { findById: jest.fn(), update: jest.fn(), list: jest.fn() };

    prisma = {
      runWithTenantContext: jest.fn((_ctx: unknown, fn: () => unknown) => fn()),
    };

    service = new BillingService(
      client,
      companyRepository as never,
      prisma as unknown as PrismaService,
    );
  });

  describe("onModuleInit", () => {
    it("não chama a API quando a AbacatePay não está configurada", async () => {
      client.isConfigured.mockReturnValue(false);
      await service.onModuleInit();
      expect(client.listProducts).not.toHaveBeenCalled();
    });

    it("reusa o produto existente por externalId em vez de criar um novo", async () => {
      client.listProducts.mockResolvedValue([
        {
          id: "prod_existing",
          externalId: ROTTA_SUBSCRIPTION_PRODUCT_EXTERNAL_ID,
          name: "x",
          price: 3990,
          currency: "BRL",
        },
      ]);
      await service.onModuleInit();
      expect(client.createProduct).not.toHaveBeenCalled();
    });

    it("cria o produto quando nenhum existente casa o externalId (conta com outros produtos de outro negócio)", async () => {
      client.listProducts.mockResolvedValue([
        {
          id: "prod_other",
          externalId: "outro-negocio",
          name: "StationCell Pro",
          price: 4700,
          currency: "BRL",
        },
      ]);
      client.createProduct.mockResolvedValue({
        id: "prod_new",
        externalId: ROTTA_SUBSCRIPTION_PRODUCT_EXTERNAL_ID,
        name: "Rotta",
        price: 3990,
        currency: "BRL",
      });
      await service.onModuleInit();
      expect(client.createProduct).toHaveBeenCalledWith(
        expect.objectContaining({
          externalId: ROTTA_SUBSCRIPTION_PRODUCT_EXTERNAL_ID,
          price: 3990,
          cycle: "MONTHLY",
        }),
      );
    });

    it("nunca derruba o boot quando a chamada à AbacatePay falha", async () => {
      client.listProducts.mockRejectedValue(new Error("timeout"));
      await expect(service.onModuleInit()).resolves.toBeUndefined();
    });
  });

  describe("createCheckoutForCompany", () => {
    it("recusa quando a AbacatePay não está configurada", async () => {
      client.isConfigured.mockReturnValue(false);
      await expect(
        service.createCheckoutForCompany("company-1", "https://app.rotta.com.br/empresa"),
      ).rejects.toThrow(BadRequestException);
    });

    it("lança NotFoundException quando a empresa não existe", async () => {
      companyRepository.findById.mockResolvedValue(null);
      await expect(
        service.createCheckoutForCompany("company-1", "https://app.rotta.com.br/empresa"),
      ).rejects.toThrow(NotFoundException);
    });

    it("cria o checkout com externalId=companyId e retorna a url hospedada", async () => {
      companyRepository.findById.mockResolvedValue(buildCompany());
      client.listProducts.mockResolvedValue([
        {
          id: "prod_existing",
          externalId: ROTTA_SUBSCRIPTION_PRODUCT_EXTERNAL_ID,
          name: "x",
          price: 3990,
          currency: "BRL",
        },
      ]);
      client.createSubscriptionCheckout.mockResolvedValue({
        id: "bill_1",
        externalId: "company-1",
        url: "https://app.abacatepay.com/pay/bill_1",
        amount: 3990,
        status: "PENDING",
      });

      const result = await service.createCheckoutForCompany(
        "company-1",
        "https://app.rotta.com.br/empresa",
      );

      expect(result).toEqual({
        url: "https://app.abacatepay.com/pay/bill_1",
        checkoutId: "bill_1",
      });
      expect(client.createSubscriptionCheckout).toHaveBeenCalledWith(
        expect.objectContaining({
          externalId: "company-1",
          returnUrl: "https://app.rotta.com.br/empresa",
          completionUrl: "https://app.rotta.com.br/empresa?billing=success",
          methods: ["CARD"],
        }),
      );
    });
  });

  describe("handleWebhookEvent", () => {
    it("ativa a empresa e persiste o subs_id em subscription.completed", async () => {
      await service.handleWebhookEvent({
        id: "log_1",
        event: "subscription.completed",
        apiVersion: "v2",
        devMode: false,
        data: {
          subscription: { id: "subs_1", status: "ACTIVE" },
          checkout: { id: "bill_1", externalId: "company-1", status: "PAID" },
        },
      });

      expect(companyRepository.update).toHaveBeenCalledWith("company-1", {
        status: CompanyStatus.ATIVO,
        abacatepaySubscriptionId: "subs_1",
      });
    });

    it("renova (subscription.renewed) da mesma forma que completed", async () => {
      await service.handleWebhookEvent({
        id: "log_2",
        event: "subscription.renewed",
        apiVersion: "v2",
        devMode: false,
        data: {
          subscription: { id: "subs_1", status: "ACTIVE" },
          checkout: { id: "bill_2", externalId: "company-1", status: "PAID" },
        },
      });
      expect(companyRepository.update).toHaveBeenCalledWith(
        "company-1",
        expect.objectContaining({ status: CompanyStatus.ATIVO }),
      );
    });

    it("marca INADIMPLENTE em subscription.payment_failed", async () => {
      await service.handleWebhookEvent({
        id: "log_3",
        event: "subscription.payment_failed",
        apiVersion: "v2",
        devMode: false,
        data: {
          checkout: { id: "bill_1", externalId: "company-1", status: "PENDING" },
          retryNumber: 1,
        },
      });
      expect(companyRepository.update).toHaveBeenCalledWith(
        "company-1",
        expect.objectContaining({ status: CompanyStatus.INADIMPLENTE }),
      );
    });

    it("marca CANCELADO em subscription.cancelled", async () => {
      await service.handleWebhookEvent({
        id: "log_4",
        event: "subscription.cancelled",
        apiVersion: "v2",
        devMode: false,
        data: {
          subscription: { id: "subs_1", status: "CANCELLED" },
          checkout: { id: "bill_1", externalId: "company-1", status: "CANCELLED" },
        },
      });
      expect(companyRepository.update).toHaveBeenCalledWith(
        "company-1",
        expect.objectContaining({ status: CompanyStatus.CANCELADO }),
      );
    });

    it("ignora silenciosamente eventos não mapeados", async () => {
      await service.handleWebhookEvent({
        id: "log_5",
        event: "checkout.completed",
        apiVersion: "v2",
        devMode: false,
        data: {},
      });
      expect(companyRepository.update).not.toHaveBeenCalled();
    });

    it("nunca lança quando checkout.externalId está ausente (correlação impossível) — só ignora", async () => {
      await expect(
        service.handleWebhookEvent({
          id: "log_6",
          event: "subscription.completed",
          apiVersion: "v2",
          devMode: false,
          data: { subscription: { id: "subs_1", status: "ACTIVE" } },
        }),
      ).resolves.toBeUndefined();
      expect(companyRepository.update).not.toHaveBeenCalled();
    });

    it("nunca lança quando a atualização da empresa falha (ex.: empresa já excluída) — só loga", async () => {
      companyRepository.update.mockRejectedValue(new Error("not found"));
      await expect(
        service.handleWebhookEvent({
          id: "log_7",
          event: "subscription.completed",
          apiVersion: "v2",
          devMode: false,
          data: { checkout: { id: "bill_1", externalId: "company-x", status: "PAID" } },
        }),
      ).resolves.toBeUndefined();
    });

    it("ativa a empresa em billing.paid usando data.billing.metadata.externalId", async () => {
      await service.handleWebhookEvent({
        id: "log_8",
        event: "billing.paid",
        apiVersion: "v1",
        devMode: false,
        data: { billing: { id: "bil_1", status: "PAID", metadata: { externalId: "company-1" } } },
      });
      expect(companyRepository.update).toHaveBeenCalledWith("company-1", {
        status: CompanyStatus.ATIVO,
      });
    });

    it("ativa a empresa em billing.paid usando data.pixQrCode.metadata.externalId (formato alternativo)", async () => {
      await service.handleWebhookEvent({
        id: "log_9",
        event: "billing.paid",
        apiVersion: "v1",
        devMode: false,
        data: { pixQrCode: { id: "pix_1", status: "PAID", metadata: { externalId: "company-1" } } },
      });
      expect(companyRepository.update).toHaveBeenCalledWith(
        "company-1",
        expect.objectContaining({ status: CompanyStatus.ATIVO }),
      );
    });

    it("nunca lança em billing.paid sem metadata.externalId reconhecível — só loga e ignora", async () => {
      await expect(
        service.handleWebhookEvent({
          id: "log_10",
          event: "billing.paid",
          apiVersion: "v1",
          devMode: false,
          data: { billing: { id: "bil_1", status: "PAID" } },
        }),
      ).resolves.toBeUndefined();
      expect(companyRepository.update).not.toHaveBeenCalled();
    });
  });

  describe("createPixCheckoutForCompany", () => {
    it("recusa quando a AbacatePay não está configurada", async () => {
      client.isConfigured.mockReturnValue(false);
      await expect(service.createPixCheckoutForCompany("company-1")).rejects.toThrow(
        BadRequestException,
      );
    });

    it("lança NotFoundException quando a empresa não existe", async () => {
      companyRepository.findById.mockResolvedValue(null);
      await expect(service.createPixCheckoutForCompany("company-1")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("cria o QR Code com metadata.externalId=companyId", async () => {
      companyRepository.findById.mockResolvedValue(buildCompany());
      client.createPixQrCode.mockResolvedValue({
        id: "pix_1",
        amount: 3990,
        status: "PENDING",
        brCode: "00020126...",
        brCodeBase64: "data:image/png;base64,xyz",
        expiresAt: "2026-08-19T13:00:00.000Z",
        createdAt: "2026-08-19T12:30:00.000Z",
      });

      const result = await service.createPixCheckoutForCompany("company-1");

      expect(result.id).toBe("pix_1");
      expect(client.createPixQrCode).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 3990,
          metadata: { externalId: "company-1" },
        }),
      );
    });
  });

  describe("getPixCheckoutStatus", () => {
    it("repassa direto para o client", async () => {
      client.checkPixQrCodeStatus.mockResolvedValue({
        id: "pix_1",
        amount: 3990,
        status: "PAID",
        brCode: "00020126...",
        brCodeBase64: "data:image/png;base64,xyz",
        expiresAt: "2026-08-19T13:00:00.000Z",
        createdAt: "2026-08-19T12:30:00.000Z",
      });
      const result = await service.getPixCheckoutStatus("pix_1");
      expect(result.status).toBe("PAID");
      expect(client.checkPixQrCodeStatus).toHaveBeenCalledWith("pix_1");
    });
  });

  describe("getAdminOverview", () => {
    function buildActiveCompany(
      overrides: Partial<{
        id: string;
        nomeFantasia: string;
        razaoSocial: string;
        planCode: string;
        planName: string;
        abacatepaySubscriptionId: string | null;
      }> = {},
    ) {
      return {
        id: overrides.id ?? "company-1",
        nomeFantasia: overrides.nomeFantasia ?? "Transportadora Exemplo",
        razaoSocial: overrides.razaoSocial ?? "Transportadora Exemplo LTDA",
        abacatepaySubscriptionId: overrides.abacatepaySubscriptionId ?? "subs_1",
        updatedAt: new Date("2026-08-01T00:00:00.000Z"),
        plan: { code: overrides.planCode ?? "MENSAL", name: overrides.planName ?? "Mensal" },
      };
    }

    it("agrupa empresas por plano e nunca fabrica valores quando a AbacatePay não está configurada", async () => {
      client.isConfigured.mockReturnValue(false);
      companyRepository.list.mockResolvedValue({
        items: [buildActiveCompany(), buildActiveCompany({ id: "company-2" })],
        total: 2,
      });

      const overview = await service.getAdminOverview();

      expect(overview.abacatepayConfigured).toBe(false);
      expect(overview.quantidadeEmpresasAtivas).toBe(2);
      expect(overview.planos).toEqual([
        { codigo: "MENSAL", nome: "Mensal", quantidadeEmpresas: 2 },
      ]);
      expect(overview.totalRecebidoCentavos).toBeNull();
      expect(overview.totalTaxaRetidaCentavos).toBeNull();
      expect(overview.quantidadeCobrancasPagas).toBeNull();
      expect(client.listBillings).not.toHaveBeenCalled();
    });

    it("soma valores recebidos e taxa retida (Pix R$0,80 fixo, cartão 3,5%+R$0,60) só das cobranças PAID", async () => {
      companyRepository.list.mockResolvedValue({
        items: [buildActiveCompany()],
        total: 1,
      });
      client.listBillings.mockResolvedValue([
        { id: "b1", status: "PAID", amount: 3990, methods: ["PIX"] },
        { id: "b2", status: "PAID", amount: 3990, methods: ["CARD"] },
        { id: "b3", status: "PENDING", amount: 3990, methods: ["PIX"] },
      ]);

      const overview = await service.getAdminOverview();

      expect(overview.quantidadeCobrancasPagas).toBe(2);
      expect(overview.totalRecebidoCentavos).toBe(3990 + 3990);
      expect(overview.totalTaxaRetidaCentavos).toBe(80 + (Math.round(3990 * 0.035) + 60));
    });

    it("nunca lança e deixa os valores null quando billing/list falha", async () => {
      companyRepository.list.mockResolvedValue({ items: [buildActiveCompany()], total: 1 });
      client.listBillings.mockRejectedValue(new Error("timeout"));

      const overview = await service.getAdminOverview();

      expect(overview.totalRecebidoCentavos).toBeNull();
      expect(overview.totalTaxaRetidaCentavos).toBeNull();
      expect(overview.quantidadeCobrancasPagas).toBeNull();
    });
  });
});

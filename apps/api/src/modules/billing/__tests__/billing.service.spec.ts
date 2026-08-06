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
    status: CompanyStatus.TRIAL,
    abacatepaySubscriptionId: null,
  } as CompanyWithPlan;
}

describe("BillingService", () => {
  let client: jest.Mocked<AbacatePayClientService>;
  let companyRepository: { findById: jest.Mock; update: jest.Mock };
  let prisma: { runWithTenantContext: jest.Mock };
  let service: BillingService;

  beforeEach(() => {
    client = {
      isConfigured: jest.fn().mockReturnValue(true),
      listProducts: jest.fn(),
      createProduct: jest.fn(),
      createSubscriptionCheckout: jest.fn(),
    } as unknown as jest.Mocked<AbacatePayClientService>;

    companyRepository = { findById: jest.fn(), update: jest.fn() };

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
  });
});

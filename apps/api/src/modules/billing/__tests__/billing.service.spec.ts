import { BadRequestException, NotFoundException } from "@nestjs/common";
import { CompanyStatus } from "@prisma/client";

import { BillingService } from "../billing.service";

import type { AbacatePayClientService } from "../abacatepay-client.service";
import type { AsaasClientService } from "../asaas-client.service";
import type { PrismaService } from "@/infra/database/prisma.service";
import type { AdminInboxEmailService } from "@/infra/email/admin-inbox-email.service";
import type { AuditLogService } from "@/modules/audit/audit-log.service";
import type { CompanyWithPlan } from "@/modules/companies/repositories/company.repository";
import type { MessagePersonalizationService } from "@/modules/notifications/message-personalization.service";
import type { UsersService } from "@/modules/users/users.service";
import type { EventEmitter2 } from "@nestjs/event-emitter";

/** "Zere os dados e só conte os dados a partir do dia de hoje" (pedido do usuário 03/09/2026) — toda cobrança PAGA que os testes esperam contar precisa de uma data de hoje, senão o filtro novo do serviço a descarta. */
const HOJE_ISO = new Date().toISOString();

function buildCompany(): CompanyWithPlan {
  return {
    id: "company-1",
    nomeFantasia: "Transportadora Exemplo",
    status: CompanyStatus.TRIAL,
    abacatepaySubscriptionId: null,
    asaasCustomerId: null,
    asaasSubscriptionId: null,
  } as CompanyWithPlan;
}

describe("BillingService", () => {
  let client: jest.Mocked<AbacatePayClientService>;
  let asaasClient: jest.Mocked<AsaasClientService>;
  let companyRepository: {
    findById: jest.Mock;
    update: jest.Mock;
    list: jest.Mock;
    listComPixProximoVencimento: jest.Mock;
  };
  let prisma: {
    runWithTenantContext: jest.Mock;
    pendingSubscription: { create: jest.Mock; update: jest.Mock; delete: jest.Mock };
  };
  let auditLogService: jest.Mocked<AuditLogService>;
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

    asaasClient = {
      isConfigured: jest.fn().mockReturnValue(false),
      createCustomer: jest.fn(),
      findCustomerByCpfCnpj: jest.fn(),
      createSubscription: jest.fn(),
      createPayment: jest.fn(),
      cancelSubscription: jest.fn(),
      getPayment: jest.fn(),
      refundPayment: jest.fn(),
      listPaymentsBySubscription: jest.fn(),
      getPixQrCode: jest.fn(),
      listPayments: jest.fn(),
      getBalance: jest.fn(),
      listFinancialTransactions: jest.fn(),
      createTransfer: jest.fn(),
    } as unknown as jest.Mocked<AsaasClientService>;

    companyRepository = {
      findById: jest.fn(),
      update: jest.fn(),
      list: jest.fn(),
      listComPixProximoVencimento: jest.fn(),
    };

    prisma = {
      runWithTenantContext: jest.fn((_ctx: unknown, fn: () => unknown) => fn()),
      pendingSubscription: {
        create: jest.fn().mockResolvedValue({ id: "pending-1" }),
        update: jest.fn().mockResolvedValue({}),
        delete: jest.fn().mockResolvedValue({}),
      },
    };

    const usersService = {
      listAdminRottaUserIds: jest.fn().mockResolvedValue([]),
      listMembershipsByCompany: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<UsersService>;
    const messagePersonalizationService = {
      planoNovaAssinatura: jest.fn().mockReturnValue({ titulo: "", corpo: "" }),
      pagamentoAprovado: jest.fn().mockReturnValue({ titulo: "", corpo: "" }),
      pagamentoRecusado: jest.fn().mockReturnValue({ titulo: "", corpo: "" }),
      pagamentoPendente: jest.fn().mockReturnValue({ titulo: "", corpo: "" }),
    } as unknown as jest.Mocked<MessagePersonalizationService>;
    const eventEmitter = { emit: jest.fn() } as unknown as jest.Mocked<EventEmitter2>;
    const adminInboxEmailService = {
      send: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<AdminInboxEmailService>;
    auditLogService = {
      record: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<AuditLogService>;

    service = new BillingService(
      client,
      asaasClient,
      companyRepository as never,
      prisma as unknown as PrismaService,
      usersService,
      messagePersonalizationService,
      eventEmitter,
      adminInboxEmailService,
      auditLogService,
    );
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
      expect(companyRepository.update).toHaveBeenCalledWith(
        "company-1",
        expect.objectContaining({ status: CompanyStatus.ATIVO, pixUltimoAvisoEm: null }),
      );
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
    it("recusa quando a Asaas não está configurada (Pix é 100% Asaas, pedido do usuário 03/09/2026)", async () => {
      asaasClient.isConfigured.mockReturnValue(false);
      await expect(service.createPixCheckoutForCompany("company-1")).rejects.toThrow(
        BadRequestException,
      );
      expect(client.createPixQrCode).not.toHaveBeenCalled();
    });

    it("lança NotFoundException quando a empresa não existe", async () => {
      asaasClient.isConfigured.mockReturnValue(true);
      companyRepository.findById.mockResolvedValue(null);
      await expect(service.createPixCheckoutForCompany("company-1")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("cria assinatura Asaas billingType PIX com externalReference=companyId e devolve o QR Code", async () => {
      asaasClient.isConfigured.mockReturnValue(true);
      companyRepository.findById.mockResolvedValue(buildCompany());
      asaasClient.createCustomer.mockResolvedValue({
        id: "cus_1",
        name: "Transportadora Exemplo",
        cpfCnpj: "12345678000199",
      });
      asaasClient.createSubscription.mockResolvedValue({
        id: "sub_1",
        customer: "cus_1",
        status: "ACTIVE",
        billingType: "PIX",
        value: 39.9,
        nextDueDate: "2026-08-27",
      });
      asaasClient.listPaymentsBySubscription.mockResolvedValue({
        data: [
          { id: "pay_1", customer: "cus_1", status: "PENDING", billingType: "PIX", value: 39.9 },
        ],
      });
      asaasClient.getPixQrCode.mockResolvedValue({
        success: true,
        encodedImage: "xyz",
        payload: "00020126...",
        expirationDate: "2026-08-19T13:00:00.000Z",
      });

      const result = await service.createPixCheckoutForCompany("company-1");

      expect(result.id).toBe("pay_1");
      expect(result.brCode).toBe("00020126...");
      expect(asaasClient.createSubscription).toHaveBeenCalledWith(
        expect.objectContaining({ billingType: "PIX", externalReference: "company-1" }),
      );
      expect(companyRepository.update).toHaveBeenCalledWith(
        "company-1",
        expect.objectContaining({ asaasCustomerId: "cus_1", asaasSubscriptionId: "sub_1" }),
      );
      expect(client.createPixQrCode).not.toHaveBeenCalled();
    });
  });

  describe("getPixCheckoutStatus", () => {
    it("busca status + QR Code na Asaas e devolve os dois juntos (o modal troca de fonte pro que vier daqui)", async () => {
      asaasClient.getPayment.mockResolvedValue({
        id: "pay_1",
        customer: "cus_1",
        status: "CONFIRMED",
        billingType: "PIX",
        value: 39.9,
      });
      asaasClient.getPixQrCode.mockResolvedValue({
        success: true,
        encodedImage: "xyz",
        payload: "00020126...",
        expirationDate: "2026-08-19T13:00:00.000Z",
      });

      const result = await service.getPixCheckoutStatus("pay_1");

      expect(result.status).toBe("PAID");
      expect(result.brCode).toBe("00020126...");
      expect(client.checkPixQrCodeStatus).not.toHaveBeenCalled();
    });
  });

  describe("createAsaasCheckoutForCompany", () => {
    it("recusa quando a Asaas não está configurada", async () => {
      asaasClient.isConfigured.mockReturnValue(false);
      await expect(
        service.createAsaasCheckoutForCompany("company-1", { billingType: "BOLETO" }),
      ).rejects.toThrow(BadRequestException);
    });

    it("lança NotFoundException quando a empresa não existe", async () => {
      asaasClient.isConfigured.mockReturnValue(true);
      companyRepository.findById.mockResolvedValue(null);
      await expect(
        service.createAsaasCheckoutForCompany("company-1", { billingType: "BOLETO" }),
      ).rejects.toThrow(NotFoundException);
    });

    it("cria cliente+assinatura e devolve o primeiro pagamento (boleto)", async () => {
      asaasClient.isConfigured.mockReturnValue(true);
      companyRepository.findById.mockResolvedValue(buildCompany());
      asaasClient.createCustomer.mockResolvedValue({
        id: "cus_1",
        name: "Transportadora Exemplo",
        cpfCnpj: "12345678000199",
      });
      asaasClient.createSubscription.mockResolvedValue({
        id: "sub_1",
        customer: "cus_1",
        status: "ACTIVE",
        billingType: "BOLETO",
        value: 39.9,
        nextDueDate: "2026-08-27",
      });
      asaasClient.listPaymentsBySubscription.mockResolvedValue({
        data: [
          {
            id: "pay_1",
            customer: "cus_1",
            subscription: "sub_1",
            status: "PENDING",
            billingType: "BOLETO",
            value: 39.9,
            identificationField: "00190.00009 03398.700000...",
            bankSlipUrl: "https://asaas.com/b/pdf/pay_1",
          },
        ],
      });

      const result = await service.createAsaasCheckoutForCompany("company-1", {
        billingType: "BOLETO",
      });

      expect(result.id).toBe("pay_1");
      expect(asaasClient.createCustomer).toHaveBeenCalledWith(
        expect.objectContaining({ externalReference: "company-1" }),
      );
      expect(asaasClient.createSubscription).toHaveBeenCalledWith(
        expect.objectContaining({ customer: "cus_1", value: 39.9, billingType: "BOLETO" }),
      );
      expect(companyRepository.update).toHaveBeenCalledWith(
        "company-1",
        expect.objectContaining({ asaasCustomerId: "cus_1", asaasSubscriptionId: "sub_1" }),
      );
    });

    it("reaproveita o asaasCustomerId já existente em vez de criar um cliente novo", async () => {
      asaasClient.isConfigured.mockReturnValue(true);
      companyRepository.findById.mockResolvedValue({
        ...buildCompany(),
        asaasCustomerId: "cus_existente",
      });
      asaasClient.createSubscription.mockResolvedValue({
        id: "sub_1",
        customer: "cus_existente",
        status: "ACTIVE",
        billingType: "BOLETO",
        value: 39.9,
        nextDueDate: "2026-08-27",
      });
      asaasClient.listPaymentsBySubscription.mockResolvedValue({
        data: [
          {
            id: "pay_1",
            customer: "cus_existente",
            status: "PENDING",
            billingType: "BOLETO",
            value: 39.9,
          },
        ],
      });

      await service.createAsaasCheckoutForCompany("company-1", { billingType: "BOLETO" });

      expect(asaasClient.createCustomer).not.toHaveBeenCalled();
      expect(asaasClient.createSubscription).toHaveBeenCalledWith(
        expect.objectContaining({ customer: "cus_existente" }),
      );
    });
  });

  describe("handleAsaasWebhookEvent", () => {
    it("ativa a empresa em PAYMENT_CONFIRMED", async () => {
      await service.handleAsaasWebhookEvent({
        event: "PAYMENT_CONFIRMED",
        payment: {
          id: "pay_1",
          customer: "cus_1",
          subscription: "sub_1",
          status: "CONFIRMED",
          billingType: "BOLETO",
          value: 39.9,
          externalReference: "company-1",
        },
      });

      expect(companyRepository.update).toHaveBeenCalledWith(
        "company-1",
        expect.objectContaining({ status: CompanyStatus.ATIVO, asaasSubscriptionId: "sub_1" }),
      );
    });

    it("marca INADIMPLENTE em PAYMENT_OVERDUE", async () => {
      await service.handleAsaasWebhookEvent({
        event: "PAYMENT_OVERDUE",
        payment: {
          id: "pay_1",
          customer: "cus_1",
          status: "OVERDUE",
          billingType: "BOLETO",
          value: 39.9,
          externalReference: "company-1",
        },
      });

      expect(companyRepository.update).toHaveBeenCalledWith(
        "company-1",
        expect.objectContaining({ status: CompanyStatus.INADIMPLENTE }),
      );
    });

    it("ignora evento sem payment.externalReference sem lançar erro", async () => {
      await expect(
        service.handleAsaasWebhookEvent({
          event: "PAYMENT_CONFIRMED",
          payment: {
            id: "pay_1",
            customer: "cus_1",
            status: "CONFIRMED",
            billingType: "BOLETO",
            value: 39.9,
          },
        }),
      ).resolves.toBeUndefined();
      expect(companyRepository.update).not.toHaveBeenCalled();
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
        { id: "b1", status: "PAID", amount: 3990, methods: ["PIX"], paidAt: HOJE_ISO },
        { id: "b2", status: "PAID", amount: 3990, methods: ["CARD"], paidAt: HOJE_ISO },
        { id: "b3", status: "PENDING", amount: 3990, methods: ["PIX"] },
      ]);

      const overview = await service.getAdminOverview();

      expect(overview.quantidadeCobrancasPagas).toBe(2);
      expect(overview.totalRecebidoCentavos).toBe(3990 + 3990);
      expect(overview.totalTaxaRetidaCentavos).toBe(80 + (Math.round(3990 * 0.035) + 60));
    });

    it("nunca conta cobrança PAID paga antes de hoje ('zere os dados', pedido do usuário 03/09/2026)", async () => {
      companyRepository.list.mockResolvedValue({ items: [buildActiveCompany()], total: 1 });
      client.listBillings.mockResolvedValue([
        {
          id: "b1",
          status: "PAID",
          amount: 3990,
          methods: ["PIX"],
          paidAt: "2020-01-01T00:00:00.000Z",
        },
      ]);

      const overview = await service.getAdminOverview();

      expect(overview.quantidadeCobrancasPagas).toBe(0);
      expect(overview.totalRecebidoCentavos).toBe(0);
    });

    it("nunca lança e deixa os valores null quando billing/list falha", async () => {
      companyRepository.list.mockResolvedValue({ items: [buildActiveCompany()], total: 1 });
      client.listBillings.mockRejectedValue(new Error("timeout"));

      const overview = await service.getAdminOverview();

      expect(overview.totalRecebidoCentavos).toBeNull();
      expect(overview.totalTaxaRetidaCentavos).toBeNull();
      expect(overview.quantidadeCobrancasPagas).toBeNull();
    });

    it("soma valores recebidos e taxa retida da Asaas (netValue já vem líquido, sem estimar fórmula) só das cobranças pagas", async () => {
      client.isConfigured.mockReturnValue(false);
      asaasClient.isConfigured.mockReturnValue(true);
      companyRepository.list.mockResolvedValue({ items: [buildActiveCompany()], total: 1 });
      asaasClient.listPayments.mockResolvedValue({
        object: "list",
        hasMore: false,
        totalCount: 3,
        limit: 100,
        offset: 0,
        data: [
          {
            id: "p1",
            customer: "cus_1",
            status: "RECEIVED",
            billingType: "BOLETO",
            value: 39.9,
            netValue: 37.91,
            paymentDate: HOJE_ISO,
          },
          {
            id: "p2",
            customer: "cus_1",
            status: "CONFIRMED",
            billingType: "CREDIT_CARD",
            value: 39.9,
            netValue: 38.5,
            paymentDate: HOJE_ISO,
          },
          { id: "p3", customer: "cus_1", status: "PENDING", billingType: "BOLETO", value: 39.9 },
        ],
      });

      const overview = await service.getAdminOverview();

      expect(overview.asaas.configured).toBe(true);
      expect(overview.asaas.quantidadeCobrancasPagas).toBe(2);
      expect(overview.asaas.totalRecebidoCentavos).toBe(3990 + 3990);
      expect(overview.asaas.totalTaxaRetidaCentavos).toBe(3990 - 3791 + (3990 - 3850));
      expect(overview.quantidadeCobrancasPagas).toBe(2);
      expect(overview.totalRecebidoCentavos).toBe(3990 + 3990);
    });

    it("pagina até hasMore virar false", async () => {
      client.isConfigured.mockReturnValue(false);
      asaasClient.isConfigured.mockReturnValue(true);
      companyRepository.list.mockResolvedValue({ items: [], total: 0 });
      asaasClient.listPayments
        .mockResolvedValueOnce({
          object: "list",
          hasMore: true,
          totalCount: 2,
          limit: 1,
          offset: 0,
          data: [
            {
              id: "p1",
              customer: "cus_1",
              status: "RECEIVED",
              billingType: "PIX",
              value: 39.9,
              netValue: 39.1,
              paymentDate: HOJE_ISO,
            },
          ],
        })
        .mockResolvedValueOnce({
          object: "list",
          hasMore: false,
          totalCount: 2,
          limit: 1,
          offset: 1,
          data: [
            {
              id: "p2",
              customer: "cus_1",
              status: "RECEIVED",
              billingType: "PIX",
              value: 39.9,
              netValue: 39.1,
              paymentDate: HOJE_ISO,
            },
          ],
        });

      const overview = await service.getAdminOverview();

      expect(asaasClient.listPayments).toHaveBeenCalledTimes(2);
      expect(overview.asaas.quantidadeCobrancasPagas).toBe(2);
    });

    it("combina AbacatePay + Asaas nos totais gerais quando os dois estão configurados", async () => {
      companyRepository.list.mockResolvedValue({ items: [], total: 0 });
      client.listBillings.mockResolvedValue([
        { id: "b1", status: "PAID", amount: 3990, methods: ["PIX"], paidAt: HOJE_ISO },
      ]);
      asaasClient.isConfigured.mockReturnValue(true);
      asaasClient.listPayments.mockResolvedValue({
        object: "list",
        hasMore: false,
        totalCount: 1,
        limit: 100,
        offset: 0,
        data: [
          {
            id: "p1",
            customer: "cus_1",
            status: "RECEIVED",
            billingType: "BOLETO",
            value: 39.9,
            netValue: 37.91,
            paymentDate: HOJE_ISO,
          },
        ],
      });

      const overview = await service.getAdminOverview();

      expect(overview.quantidadeCobrancasPagas).toBe(2);
      expect(overview.totalRecebidoCentavos).toBe(3990 + 3990);
      expect(overview.lucroLiquidoCentavos).not.toBeNull();
    });

    it("nunca lança e deixa o bloco Asaas com valores null quando a Asaas falha", async () => {
      client.isConfigured.mockReturnValue(false);
      asaasClient.isConfigured.mockReturnValue(true);
      companyRepository.list.mockResolvedValue({ items: [], total: 0 });
      asaasClient.listPayments.mockRejectedValue(new Error("timeout"));

      const overview = await service.getAdminOverview();

      expect(overview.asaas.configured).toBe(true);
      expect(overview.asaas.totalRecebidoCentavos).toBeNull();
      expect(overview.totalRecebidoCentavos).toBeNull();
    });
  });

  describe("processarVencimentosPix", () => {
    function buildDueCompany(
      overrides: Partial<{ pixProximoVencimento: Date | null; pixUltimoAvisoEm: Date | null }> = {},
    ): CompanyWithPlan {
      return {
        ...buildCompany(),
        status: CompanyStatus.ATIVO,
        pixProximoVencimento: overrides.pixProximoVencimento ?? null,
        pixUltimoAvisoEm: overrides.pixUltimoAvisoEm ?? null,
      };
    }

    it("não faz nada e não quebra quando a AbacatePay não está configurada", async () => {
      client.isConfigured.mockReturnValue(false);

      const resultado = await service.processarVencimentosPix();

      expect(resultado).toEqual({ reenviados: 0, marcadosInadimplentes: 0 });
      expect(companyRepository.listComPixProximoVencimento).not.toHaveBeenCalled();
    });

    it("reemite o Pix pra empresa dentro da janela de reenvio sem aviso recente", async () => {
      const daquiA3Dias = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
      companyRepository.listComPixProximoVencimento.mockResolvedValue([
        buildDueCompany({ pixProximoVencimento: daquiA3Dias }),
      ]);
      client.createPixQrCode.mockResolvedValue({} as never);

      const resultado = await service.processarVencimentosPix();

      expect(client.createPixQrCode).toHaveBeenCalledWith(
        expect.objectContaining({ metadata: { externalId: "company-1" } }),
      );
      expect(companyRepository.update).toHaveBeenCalledWith(
        "company-1",
        expect.objectContaining({ pixUltimoAvisoEm: expect.any(Date) }),
      );
      expect(resultado).toEqual({ reenviados: 1, marcadosInadimplentes: 0 });
    });

    it("não reemite de novo antes de PIX_REISSUE_REPEAT_DAYS do último aviso", async () => {
      const daquiA3Dias = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
      const avisadoOntem = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000);
      companyRepository.listComPixProximoVencimento.mockResolvedValue([
        buildDueCompany({ pixProximoVencimento: daquiA3Dias, pixUltimoAvisoEm: avisadoOntem }),
      ]);

      const resultado = await service.processarVencimentosPix();

      expect(client.createPixQrCode).not.toHaveBeenCalled();
      expect(resultado).toEqual({ reenviados: 0, marcadosInadimplentes: 0 });
    });

    it("marca INADIMPLENTE quem passou da folga de vencimento sem pagar", async () => {
      const venceuFaz3Dias = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
      companyRepository.listComPixProximoVencimento.mockResolvedValue([
        buildDueCompany({ pixProximoVencimento: venceuFaz3Dias }),
      ]);

      const resultado = await service.processarVencimentosPix();

      expect(companyRepository.update).toHaveBeenCalledWith(
        "company-1",
        expect.objectContaining({ status: CompanyStatus.INADIMPLENTE }),
      );
      expect(client.createPixQrCode).not.toHaveBeenCalled();
      expect(resultado).toEqual({ reenviados: 0, marcadosInadimplentes: 1 });
    });

    it("não mexe em quem ainda está longe do vencimento", async () => {
      const daquiA20Dias = new Date(Date.now() + 20 * 24 * 60 * 60 * 1000);
      companyRepository.listComPixProximoVencimento.mockResolvedValue([
        buildDueCompany({ pixProximoVencimento: daquiA20Dias }),
      ]);

      const resultado = await service.processarVencimentosPix();

      expect(client.createPixQrCode).not.toHaveBeenCalled();
      expect(companyRepository.update).not.toHaveBeenCalled();
      expect(resultado).toEqual({ reenviados: 0, marcadosInadimplentes: 0 });
    });
  });

  describe("createPreSignupPixCheckout", () => {
    const dto = {
      nome: "João da Silva",
      email: "joao@example.com",
      cpfCnpj: "11144477735",
    };

    it("usa a Asaas quando configurada — caminho padrão agora (pedido do usuário 03/09/2026: 'tiram o Pix da AbacatePay')", async () => {
      // AbacatePay continua "configurada" (default do mock) — a
      // prioridade nova é da Asaas ganhar de qualquer jeito, não só
      // quando a AbacatePay falta.
      asaasClient.isConfigured.mockReturnValue(true);
      asaasClient.createCustomer.mockResolvedValue({
        id: "cus_1",
        name: dto.nome,
        cpfCnpj: dto.cpfCnpj,
      });
      asaasClient.createSubscription.mockResolvedValue({
        id: "sub_1",
        customer: "cus_1",
        status: "ACTIVE",
        billingType: "PIX",
        value: 39.9,
        nextDueDate: "2026-01-01",
      });
      asaasClient.listPaymentsBySubscription.mockResolvedValue({
        data: [
          { id: "pay_1", customer: "cus_1", status: "PENDING", billingType: "PIX", value: 39.9 },
        ],
      });
      asaasClient.getPixQrCode.mockResolvedValue({
        success: true,
        encodedImage: "base64-qr",
        payload: "00020126-copia-e-cola",
        expirationDate: "2026-01-02T00:00:00.000Z",
      });

      const result = await service.createPreSignupPixCheckout(dto);

      expect(asaasClient.createSubscription).toHaveBeenCalledWith(
        expect.objectContaining({ billingType: "PIX" }),
      );
      expect(result.checkout.id).toBe("pay_1");
      expect(client.createPixQrCode).not.toHaveBeenCalled();
    });

    it("cai pra AbacatePay só quando a Asaas não está configurada (último recurso)", async () => {
      asaasClient.isConfigured.mockReturnValue(false);
      client.isConfigured.mockReturnValue(true);
      client.createPixQrCode.mockResolvedValue({
        id: "pix_1",
        amount: 3990,
        status: "PENDING",
        brCode: "00020126...",
        brCodeBase64: "base64...",
        expiresAt: "2026-01-01T00:00:00.000Z",
        createdAt: "2026-01-01T00:00:00.000Z",
      });

      const result = await service.createPreSignupPixCheckout(dto);

      expect(client.createPixQrCode).toHaveBeenCalled();
      expect(asaasClient.createCustomer).not.toHaveBeenCalled();
      expect(result.checkout.id).toBe("pix_1");
    });

    it("cai pra Asaas (billingType PIX) quando a AbacatePay não está configurada (mesmo teste de sempre, prioridade continua funcionando nesse sentido também)", async () => {
      client.isConfigured.mockReturnValue(false);
      asaasClient.isConfigured.mockReturnValue(true);
      asaasClient.createCustomer.mockResolvedValue({
        id: "cus_1",
        name: dto.nome,
        cpfCnpj: dto.cpfCnpj,
      });
      asaasClient.createSubscription.mockResolvedValue({
        id: "sub_1",
        customer: "cus_1",
        status: "ACTIVE",
        billingType: "PIX",
        value: 39.9,
        nextDueDate: "2026-01-01",
      });
      asaasClient.listPaymentsBySubscription.mockResolvedValue({
        data: [
          {
            id: "pay_1",
            customer: "cus_1",
            status: "PENDING",
            billingType: "PIX",
            value: 39.9,
          },
        ],
      });
      asaasClient.getPixQrCode.mockResolvedValue({
        success: true,
        encodedImage: "base64-qr",
        payload: "00020126-copia-e-cola",
        expirationDate: "2026-01-02T00:00:00.000Z",
      });

      const result = await service.createPreSignupPixCheckout(dto);

      expect(asaasClient.createSubscription).toHaveBeenCalledWith(
        expect.objectContaining({ billingType: "PIX" }),
      );
      expect(asaasClient.getPixQrCode).toHaveBeenCalledWith("pay_1");
      expect(result.checkout).toEqual({
        id: "pay_1",
        amount: 3990,
        status: "PENDING",
        brCode: "00020126-copia-e-cola",
        brCodeBase64: "base64-qr",
        expiresAt: "2026-01-02T00:00:00.000Z",
        createdAt: expect.any(String),
      });
      expect(prisma.pendingSubscription.delete).not.toHaveBeenCalled();
    });

    it("recusa o fallback Asaas sem CPF/CNPJ (obrigatório só nesse caminho)", async () => {
      client.isConfigured.mockReturnValue(false);
      asaasClient.isConfigured.mockReturnValue(true);

      await expect(
        service.createPreSignupPixCheckout({ nome: "João", email: "joao@example.com" }),
      ).rejects.toThrow(BadRequestException);
      expect(asaasClient.createCustomer).not.toHaveBeenCalled();
    });

    it("lança erro claro quando nenhum provedor de Pix está configurado", async () => {
      client.isConfigured.mockReturnValue(false);
      asaasClient.isConfigured.mockReturnValue(false);

      await expect(service.createPreSignupPixCheckout(dto)).rejects.toThrow(BadRequestException);
    });

    it("apaga a PendingSubscription órfã se a Asaas falhar no meio do caminho", async () => {
      client.isConfigured.mockReturnValue(false);
      asaasClient.isConfigured.mockReturnValue(true);
      asaasClient.createCustomer.mockRejectedValue(new Error("Asaas fora do ar"));

      await expect(service.createPreSignupPixCheckout(dto)).rejects.toThrow("Asaas fora do ar");
      expect(prisma.pendingSubscription.delete).toHaveBeenCalledWith({
        where: { id: "pending-1" },
      });
    });
  });

  describe("getAdminBalance", () => {
    it("nunca fabrica saldo quando a Asaas não está configurada", async () => {
      asaasClient.isConfigured.mockReturnValue(false);

      const balance = await service.getAdminBalance();

      expect(balance).toEqual({ configured: false, saldoCentavos: null });
      expect(asaasClient.getBalance).not.toHaveBeenCalled();
    });

    it("converte o saldo (reais, formato Asaas) pra centavos", async () => {
      asaasClient.isConfigured.mockReturnValue(true);
      asaasClient.getBalance.mockResolvedValue({ balance: 1234.56 });

      const balance = await service.getAdminBalance();

      expect(balance).toEqual({ configured: true, saldoCentavos: 123456 });
    });
  });

  describe("getAdminStatement", () => {
    it("nunca fabrica extrato quando a Asaas não está configurada", async () => {
      asaasClient.isConfigured.mockReturnValue(false);

      const statement = await service.getAdminStatement(1, 20);

      expect(statement).toEqual({ configured: false, items: [], total: 0, page: 1, pageSize: 20 });
      expect(asaasClient.listFinancialTransactions).not.toHaveBeenCalled();
    });

    it("pagina corretamente (offset = (page-1)*pageSize) e converte valores pra centavos", async () => {
      asaasClient.isConfigured.mockReturnValue(true);
      asaasClient.listFinancialTransactions.mockResolvedValue({
        object: "list",
        hasMore: false,
        totalCount: 1,
        limit: 20,
        offset: 20,
        data: [
          {
            date: "2026-09-03",
            value: 399.9,
            balance: 1000,
            type: "PAYMENT_RECEIVED",
            description: "Mensalidade",
          },
        ],
      });

      const statement = await service.getAdminStatement(2, 20);

      expect(asaasClient.listFinancialTransactions).toHaveBeenCalledWith({
        offset: 20,
        limit: 20,
        startDate: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      });
      expect(statement).toEqual({
        configured: true,
        items: [
          {
            data: "2026-09-03",
            valorCentavos: 39990,
            saldoAposCentavos: 100000,
            tipo: "PAYMENT_RECEIVED",
            descricao: "Mensalidade",
          },
        ],
        total: 1,
        page: 2,
        pageSize: 20,
      });
    });
  });

  describe("createAdminTransfer", () => {
    const actor = {
      sub: "admin-1",
      tenantId: null,
      role: "ADMIN_ROTTA",
      vinculoId: "vinculo-1",
    } as unknown as Parameters<BillingService["createAdminTransfer"]>[1];
    const dto = {
      valorCentavos: 10000,
      chavePix: "financeiro@rottabr.com.br",
      tipoChavePix: "EMAIL" as const,
      descricao: "Repasse mensal",
    };

    it("lança erro claro quando a Asaas não está configurada — nunca finge sucesso", async () => {
      asaasClient.isConfigured.mockReturnValue(false);

      await expect(service.createAdminTransfer(dto, actor, { ip: "127.0.0.1" })).rejects.toThrow(
        "Asaas não está configurada",
      );
      expect(asaasClient.createTransfer).not.toHaveBeenCalled();
      expect(auditLogService.record).not.toHaveBeenCalled();
    });

    it("converte centavos pra reais e sempre audita a transferência (RN-32)", async () => {
      asaasClient.isConfigured.mockReturnValue(true);
      asaasClient.createTransfer.mockResolvedValue({
        id: "transfer-1",
        value: 100,
        status: "PENDING",
      });

      const transfer = await service.createAdminTransfer(dto, actor, {
        ip: "127.0.0.1",
        userAgent: "jest",
      });

      expect(asaasClient.createTransfer).toHaveBeenCalledWith({
        value: 100,
        pixAddressKey: "financeiro@rottabr.com.br",
        pixAddressKeyType: "EMAIL",
        operationType: "PIX",
        description: "Repasse mensal",
      });
      expect(transfer).toEqual({ id: "transfer-1", value: 100, status: "PENDING" });
      expect(auditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          entidadeTipo: "AsaasTransfer",
          entidadeId: "transfer-1",
          acao: "ADMIN_CREATED_TRANSFER",
          atorUserId: "admin-1",
          ip: "127.0.0.1",
          userAgent: "jest",
        }),
      );
    });
  });

  describe("createAdminPixCharge", () => {
    const actor = {
      sub: "admin-1",
      tenantId: null,
      role: "ADMIN_ROTTA",
      vinculoId: "vinculo-1",
    } as unknown as Parameters<BillingService["createAdminPixCharge"]>[1];
    const dto = {
      valorCentavos: 5000,
      descricao: "Reembolso de combustível",
      nomePagador: "Fornecedor Exemplo",
      cpfCnpjPagador: "12345678000199",
      emailPagador: "fornecedor@exemplo.com",
    };

    it("lança erro claro quando a Asaas não está configurada — nunca finge sucesso", async () => {
      asaasClient.isConfigured.mockReturnValue(false);

      await expect(service.createAdminPixCharge(dto, actor, { ip: "127.0.0.1" })).rejects.toThrow(
        "Asaas não está configurada",
      );
      expect(asaasClient.createPayment).not.toHaveBeenCalled();
      expect(auditLogService.record).not.toHaveBeenCalled();
    });

    it("reaproveita um AsaasCustomer já existente pro mesmo CPF/CNPJ (nunca duplica)", async () => {
      asaasClient.isConfigured.mockReturnValue(true);
      asaasClient.findCustomerByCpfCnpj.mockResolvedValue({
        id: "cus_existente",
        name: "Fornecedor Exemplo",
        cpfCnpj: "12345678000199",
      });
      asaasClient.createPayment.mockResolvedValue({
        id: "pay_1",
        customer: "cus_existente",
        status: "PENDING",
        billingType: "PIX",
        value: 50,
      });
      asaasClient.getPixQrCode.mockResolvedValue({
        success: true,
        encodedImage: "base64img",
        payload: "copia-e-cola",
        expirationDate: "2026-01-01T00:00:00Z",
      });

      const checkout = await service.createAdminPixCharge(dto, actor, { ip: "127.0.0.1" });

      expect(asaasClient.createCustomer).not.toHaveBeenCalled();
      expect(asaasClient.createPayment).toHaveBeenCalledWith(
        expect.objectContaining({ customer: "cus_existente", billingType: "PIX", value: 50 }),
      );
      expect(checkout.brCode).toBe("copia-e-cola");
      expect(checkout.brCodeBase64).toBe("base64img");
    });

    it("cria um AsaasCustomer novo quando não encontra nenhum pro CPF/CNPJ, e audita a cobrança (RN-32)", async () => {
      asaasClient.isConfigured.mockReturnValue(true);
      asaasClient.findCustomerByCpfCnpj.mockResolvedValue(null);
      asaasClient.createCustomer.mockResolvedValue({
        id: "cus_novo",
        name: "Fornecedor Exemplo",
        cpfCnpj: "12345678000199",
      });
      asaasClient.createPayment.mockResolvedValue({
        id: "pay_2",
        customer: "cus_novo",
        status: "PENDING",
        billingType: "PIX",
        value: 50,
      });
      asaasClient.getPixQrCode.mockResolvedValue({
        success: true,
        encodedImage: "base64img",
        payload: "copia-e-cola",
        expirationDate: "2026-01-01T00:00:00Z",
      });

      await service.createAdminPixCharge(dto, actor, { ip: "127.0.0.1", userAgent: "jest" });

      expect(asaasClient.createCustomer).toHaveBeenCalledWith(
        expect.objectContaining({ name: "Fornecedor Exemplo", cpfCnpj: "12345678000199" }),
      );
      expect(auditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          entidadeTipo: "AsaasPayment",
          entidadeId: "pay_2",
          acao: "ADMIN_CREATED_PIX_CHARGE",
          atorUserId: "admin-1",
        }),
      );
    });
  });

  describe("refundAdminPayment", () => {
    const actor = {
      sub: "admin-1",
      tenantId: null,
      role: "ADMIN_ROTTA",
      vinculoId: "vinculo-1",
    } as unknown as Parameters<BillingService["refundAdminPayment"]>[1];

    it("lança erro claro quando a Asaas não está configurada — nunca finge sucesso", async () => {
      asaasClient.isConfigured.mockReturnValue(false);

      await expect(service.refundAdminPayment("pay_1", actor, { ip: "127.0.0.1" })).rejects.toThrow(
        "Asaas não está configurada",
      );
      expect(asaasClient.refundPayment).not.toHaveBeenCalled();
    });

    it("estorna e sempre audita (RN-32)", async () => {
      asaasClient.isConfigured.mockReturnValue(true);
      asaasClient.refundPayment.mockResolvedValue({
        id: "pay_1",
        customer: "cus_1",
        status: "REFUNDED",
        billingType: "PIX",
        value: 50,
      });

      const payment = await service.refundAdminPayment("pay_1", actor, {
        ip: "127.0.0.1",
        userAgent: "jest",
      });

      expect(asaasClient.refundPayment).toHaveBeenCalledWith("pay_1");
      expect(payment.status).toBe("REFUNDED");
      expect(auditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          entidadeTipo: "AsaasPayment",
          entidadeId: "pay_1",
          acao: "ADMIN_REFUNDED_PAYMENT",
          atorUserId: "admin-1",
        }),
      );
    });
  });

  describe("cancelCompanySubscription", () => {
    const actor = {
      sub: "admin-1",
      tenantId: null,
      role: "ADMIN_ROTTA",
      vinculoId: "vinculo-1",
    } as unknown as Parameters<BillingService["cancelCompanySubscription"]>[1];

    it("lança 404 quando a empresa não existe", async () => {
      companyRepository.findById.mockResolvedValue(null);

      await expect(
        service.cancelCompanySubscription("company-x", actor, { ip: "127.0.0.1" }),
      ).rejects.toThrow(NotFoundException);
    });

    it("lança erro claro quando a empresa não tem assinatura Asaas ativa", async () => {
      companyRepository.findById.mockResolvedValue(buildCompany());

      await expect(
        service.cancelCompanySubscription("company-1", actor, { ip: "127.0.0.1" }),
      ).rejects.toThrow("Esta empresa não tem assinatura Asaas ativa");
      expect(asaasClient.cancelSubscription).not.toHaveBeenCalled();
    });

    it("cancela na Asaas, marca a empresa CANCELADO e audita (RN-32)", async () => {
      companyRepository.findById.mockResolvedValue({
        ...buildCompany(),
        asaasSubscriptionId: "sub_123",
      });
      asaasClient.isConfigured.mockReturnValue(true);
      asaasClient.cancelSubscription.mockResolvedValue({
        id: "sub_123",
        customer: "cus_1",
        status: "INACTIVE",
        billingType: "PIX",
        value: 39.9,
        nextDueDate: "2026-01-01",
      });

      const result = await service.cancelCompanySubscription("company-1", actor, {
        ip: "127.0.0.1",
        userAgent: "jest",
      });

      expect(asaasClient.cancelSubscription).toHaveBeenCalledWith("sub_123");
      expect(companyRepository.update).toHaveBeenCalledWith("company-1", {
        status: CompanyStatus.CANCELADO,
      });
      expect(result).toEqual({ cancelled: true });
      expect(auditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          entidadeTipo: "Company",
          entidadeId: "company-1",
          acao: "ADMIN_CANCELLED_SUBSCRIPTION",
          atorUserId: "admin-1",
        }),
      );
    });
  });

  describe("getCompanyPaymentHistory", () => {
    it("lança 404 quando a empresa não existe", async () => {
      companyRepository.findById.mockResolvedValue(null);

      await expect(service.getCompanyPaymentHistory("company-x")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("usa listPaymentsBySubscription (correlação confiável) quando a empresa tem asaasSubscriptionId", async () => {
      companyRepository.findById.mockResolvedValue({
        ...buildCompany(),
        asaasSubscriptionId: "sub_123",
      });
      asaasClient.isConfigured.mockReturnValue(true);
      asaasClient.listPaymentsBySubscription.mockResolvedValue({
        data: [
          {
            id: "pay_1",
            customer: "cus_1",
            status: "CONFIRMED",
            billingType: "CREDIT_CARD",
            value: 39.9,
            netValue: 38.5,
            paymentDate: HOJE_ISO,
          },
        ],
      });

      const result = await service.getCompanyPaymentHistory("company-1");

      expect(asaasClient.listPaymentsBySubscription).toHaveBeenCalledWith("sub_123");
      expect(result.provider).toBe("asaas");
      expect(result.items).toEqual([
        {
          id: "pay_1",
          status: "CONFIRMED",
          valorCentavos: 3990,
          liquidoCentavos: 3850,
          taxaCentavos: 140,
          metodo: "CREDIT_CARD",
          data: HOJE_ISO,
        },
      ]);
    });

    it("nunca mostra pagamento anterior a hoje ('o histórico também só deverá mostrar a partir de hoje', pedido do usuário 03/09/2026)", async () => {
      companyRepository.findById.mockResolvedValue({
        ...buildCompany(),
        asaasSubscriptionId: "sub_123",
      });
      asaasClient.isConfigured.mockReturnValue(true);
      asaasClient.listPaymentsBySubscription.mockResolvedValue({
        data: [
          {
            id: "pay_antigo",
            customer: "cus_1",
            status: "CONFIRMED",
            billingType: "PIX",
            value: 39.9,
            paymentDate: "2020-01-01T00:00:00.000Z",
          },
        ],
      });

      const result = await service.getCompanyPaymentHistory("company-1");

      expect(result.items).toEqual([]);
    });

    it("nunca inventa correlação pra AbacatePay — devolve items: [] com um motivo explicando por quê", async () => {
      companyRepository.findById.mockResolvedValue({
        ...buildCompany(),
        abacatepaySubscriptionId: "sub_abc",
      });

      const result = await service.getCompanyPaymentHistory("company-1");

      expect(result.provider).toBe("abacatepay");
      expect(result.items).toEqual([]);
      expect(result.note).toBeTruthy();
    });

    it("empresa sem nenhuma assinatura recorrente — items: [] com motivo, nunca erro", async () => {
      companyRepository.findById.mockResolvedValue(buildCompany());

      const result = await service.getCompanyPaymentHistory("company-1");

      expect(result.provider).toBe("nenhum");
      expect(result.items).toEqual([]);
      expect(result.note).toBeTruthy();
    });
  });
});

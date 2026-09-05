import { AdminDigestService } from "../admin-digest.service";

import type { PrismaService } from "@/infra/database/prisma.service";
import type { AdminInboxEmailService } from "@/infra/email/admin-inbox-email.service";
import type { BillingService } from "@/modules/billing/billing.service";
import type { MessagePersonalizationService } from "@/modules/notifications/message-personalization.service";
import type { UsersService } from "@/modules/users/users.service";
import type { EventEmitter2 } from "@nestjs/event-emitter";

describe("AdminDigestService", () => {
  let prisma: {
    runWithTenantContext: jest.Mock;
    company: { count: jest.Mock };
    supportTicket: { count: jest.Mock };
  };
  let billingService: jest.Mocked<Pick<BillingService, "reconciliarPagamentosAsaas">>;
  let usersService: jest.Mocked<Pick<UsersService, "listAdminRottaUserIds">>;
  let messagePersonalizationService: jest.Mocked<
    Pick<MessagePersonalizationService, "relatorioAdmin">
  >;
  let eventEmitter: jest.Mocked<Pick<EventEmitter2, "emit">>;
  let adminInboxEmailService: jest.Mocked<Pick<AdminInboxEmailService, "send">>;
  let service: AdminDigestService;

  beforeEach(() => {
    prisma = {
      runWithTenantContext: jest.fn((_ctx: unknown, fn: () => unknown) => fn()),
      company: { count: jest.fn().mockResolvedValue(0) },
      supportTicket: { count: jest.fn().mockResolvedValue(0) },
    };
    billingService = {
      reconciliarPagamentosAsaas: jest.fn(),
    };
    usersService = { listAdminRottaUserIds: jest.fn().mockResolvedValue(["admin-1", "admin-2"]) };
    messagePersonalizationService = {
      relatorioAdmin: jest.fn().mockReturnValue({ titulo: "Resumo", corpo: "..." }),
    };
    eventEmitter = { emit: jest.fn() };
    adminInboxEmailService = { send: jest.fn().mockResolvedValue(undefined) };

    service = new AdminDigestService(
      prisma as unknown as PrismaService,
      billingService as unknown as BillingService,
      usersService as unknown as UsersService,
      messagePersonalizationService as unknown as MessagePersonalizationService,
      eventEmitter as unknown as EventEmitter2,
      adminInboxEmailService as unknown as AdminInboxEmailService,
    );
  });

  describe("periodoUltimaSemana", () => {
    it("volta exatamente 7 dias a partir da referência", () => {
      const referencia = new Date("2026-09-08T11:00:00.000Z");
      const periodo = service.periodoUltimaSemana(referencia);

      expect(periodo.fim).toEqual(referencia);
      expect(periodo.inicio).toEqual(new Date("2026-09-01T11:00:00.000Z"));
      expect(periodo.label).toBe("semanal");
    });
  });

  describe("periodoUltimoMes", () => {
    it("é o mês de calendário anterior, do dia 1º ao dia 1º", () => {
      const referencia = new Date("2026-09-15T11:00:00.000Z");
      const periodo = service.periodoUltimoMes(referencia);

      expect(periodo.inicio).toEqual(new Date(Date.UTC(2026, 7, 1)));
      expect(periodo.fim).toEqual(new Date(Date.UTC(2026, 8, 1)));
      expect(periodo.label).toBe("mensal");
    });

    it("janeiro cai corretamente em dezembro do ano anterior", () => {
      const referencia = new Date("2027-01-10T11:00:00.000Z");
      const periodo = service.periodoUltimoMes(referencia);

      expect(periodo.inicio).toEqual(new Date(Date.UTC(2026, 11, 1)));
      expect(periodo.fim).toEqual(new Date(Date.UTC(2027, 0, 1)));
    });
  });

  describe("gerarResumo", () => {
    const periodo = {
      inicio: new Date("2026-09-01"),
      fim: new Date("2026-09-08"),
      label: "semanal",
    };

    it("faturamento/lucro ficam null quando a reconciliação Asaas falha (nunca 0 fingido, ex.: Asaas não configurada)", async () => {
      billingService.reconciliarPagamentosAsaas.mockRejectedValue(
        new Error("Asaas não está configurada (ASAAS_API_KEY ausente)"),
      );

      const resumo = await service.gerarResumo(periodo);

      expect(resumo.faturamentoCentavos).toBeNull();
      expect(resumo.lucroLiquidoCentavos).toBeNull();
    });

    it("reaproveita BillingService.reconciliarPagamentosAsaas, passando o período inteiro (inicio+fim)", async () => {
      billingService.reconciliarPagamentosAsaas.mockResolvedValue({
        totalRecebidoCentavos: 7980,
        totalTaxaRetidaCentavos: 220,
        quantidadeCobrancasPagas: 2,
      });

      const resumo = await service.gerarResumo(periodo);

      expect(billingService.reconciliarPagamentosAsaas).toHaveBeenCalledWith({
        inicio: periodo.inicio,
        fim: periodo.fim,
      });
      expect(resumo.faturamentoCentavos).toBe(7980);
      expect(resumo.lucroLiquidoCentavos).toBe(7980 - 220);
    });

    it("conta empresas/chamados via Prisma, dentro do bypass cross-tenant", async () => {
      billingService.reconciliarPagamentosAsaas.mockResolvedValue({
        totalRecebidoCentavos: 0,
        totalTaxaRetidaCentavos: 0,
        quantidadeCobrancasPagas: 0,
      });

      await service.gerarResumo(periodo);

      expect(prisma.runWithTenantContext).toHaveBeenCalledWith(
        { tenantId: null, bypass: true },
        expect.any(Function),
      );
      expect(prisma.company.count).toHaveBeenCalled();
      expect(prisma.supportTicket.count).toHaveBeenCalled();
    });
  });

  describe("enviarResumo", () => {
    it("notifica cada Admin Rotta com o mesmo título/corpo do resumo composto", async () => {
      billingService.reconciliarPagamentosAsaas.mockResolvedValue({
        totalRecebidoCentavos: 0,
        totalTaxaRetidaCentavos: 0,
        quantidadeCobrancasPagas: 0,
      });

      await service.enviarResumo("RELATORIO_SEMANAL", {
        inicio: new Date("2026-09-01"),
        fim: new Date("2026-09-08"),
        label: "semanal",
      });

      expect(messagePersonalizationService.relatorioAdmin).toHaveBeenCalledTimes(1);
      expect(eventEmitter.emit).toHaveBeenCalledTimes(2);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        "communication.requested",
        expect.objectContaining({ userId: "admin-1", tipo: "RELATORIO_SEMANAL", titulo: "Resumo" }),
      );
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        "communication.requested",
        expect.objectContaining({ userId: "admin-2", tipo: "RELATORIO_SEMANAL" }),
      );
    });
  });
});

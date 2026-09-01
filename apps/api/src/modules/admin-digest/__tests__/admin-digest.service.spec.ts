import { AdminDigestService } from "../admin-digest.service";

import type { PrismaService } from "@/infra/database/prisma.service";
import type { AbacatePayClientService } from "@/modules/billing/abacatepay-client.service";
import type { AbacatePayBilling } from "@/modules/billing/types/abacatepay.types";
import type { MessagePersonalizationService } from "@/modules/notifications/message-personalization.service";
import type { UsersService } from "@/modules/users/users.service";
import type { EventEmitter2 } from "@nestjs/event-emitter";

function buildBilling(overrides: Partial<AbacatePayBilling> = {}): AbacatePayBilling {
  return {
    id: "bill-1",
    status: "PAID",
    amount: 3990,
    methods: ["PIX"],
    paidAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("AdminDigestService", () => {
  let prisma: {
    runWithTenantContext: jest.Mock;
    company: { count: jest.Mock };
    supportTicket: { count: jest.Mock };
  };
  let abacatePayClient: jest.Mocked<Pick<AbacatePayClientService, "isConfigured" | "listBillings">>;
  let usersService: jest.Mocked<Pick<UsersService, "listAdminRottaUserIds">>;
  let messagePersonalizationService: jest.Mocked<
    Pick<MessagePersonalizationService, "relatorioAdmin">
  >;
  let eventEmitter: jest.Mocked<Pick<EventEmitter2, "emit">>;
  let service: AdminDigestService;

  beforeEach(() => {
    prisma = {
      runWithTenantContext: jest.fn((_ctx: unknown, fn: () => unknown) => fn()),
      company: { count: jest.fn().mockResolvedValue(0) },
      supportTicket: { count: jest.fn().mockResolvedValue(0) },
    };
    abacatePayClient = {
      isConfigured: jest.fn().mockReturnValue(false),
      listBillings: jest.fn(),
    };
    usersService = { listAdminRottaUserIds: jest.fn().mockResolvedValue(["admin-1", "admin-2"]) };
    messagePersonalizationService = {
      relatorioAdmin: jest.fn().mockReturnValue({ titulo: "Resumo", corpo: "..." }),
    };
    eventEmitter = { emit: jest.fn() };

    service = new AdminDigestService(
      prisma as unknown as PrismaService,
      abacatePayClient as unknown as AbacatePayClientService,
      usersService as unknown as UsersService,
      messagePersonalizationService as unknown as MessagePersonalizationService,
      eventEmitter as unknown as EventEmitter2,
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

    it("faturamento/lucro ficam null quando a AbacatePay não está configurada (nunca 0 fingido)", async () => {
      const resumo = await service.gerarResumo(periodo);

      expect(resumo.faturamentoAbacatePayCentavos).toBeNull();
      expect(resumo.lucroLiquidoAbacatePayCentavos).toBeNull();
      expect(resumo.faturamentoAsaasCentavos).toBeNull();
      expect(abacatePayClient.listBillings).not.toHaveBeenCalled();
    });

    it("soma só as cobranças PAGAS dentro do período, calculando a taxa por método (PIX vs cartão)", async () => {
      abacatePayClient.isConfigured.mockReturnValue(true);
      abacatePayClient.listBillings.mockResolvedValue([
        buildBilling({ id: "b1", amount: 3990, methods: ["PIX"], paidAt: "2026-09-03T10:00:00Z" }),
        buildBilling({
          id: "b2",
          amount: 3990,
          methods: ["CARD"],
          paidAt: "2026-09-05T10:00:00Z",
        }),
        // Fora do período — não deve entrar na soma.
        buildBilling({ id: "b3", amount: 3990, methods: ["PIX"], paidAt: "2026-08-20T10:00:00Z" }),
        // Não paga — não deve entrar.
        buildBilling({ id: "b4", amount: 3990, status: "PENDING", paidAt: null }),
      ]);

      const resumo = await service.gerarResumo(periodo);

      // PIX: taxa fixa 80. Cartão: 3990*0.035 (arredondado) + 60.
      const taxaPix = 80;
      const taxaCartao = Math.round(3990 * 0.035) + 60;
      expect(resumo.faturamentoAbacatePayCentavos).toBe(3990 + 3990);
      expect(resumo.lucroLiquidoAbacatePayCentavos).toBe(3990 + 3990 - taxaPix - taxaCartao);
    });

    it("nunca lança e devolve null quando a AbacatePay está configurada mas a consulta falha", async () => {
      abacatePayClient.isConfigured.mockReturnValue(true);
      abacatePayClient.listBillings.mockRejectedValue(new Error("timeout"));

      const resumo = await service.gerarResumo(periodo);

      expect(resumo.faturamentoAbacatePayCentavos).toBeNull();
      expect(resumo.lucroLiquidoAbacatePayCentavos).toBeNull();
    });

    it("conta empresas/chamados via Prisma, dentro do bypass cross-tenant", async () => {
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

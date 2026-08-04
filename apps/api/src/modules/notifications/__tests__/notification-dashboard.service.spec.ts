
import { NotificationDashboardService } from "../notification-dashboard.service";

import type {
  DeliveryStatsByCompanyRow,
  NotificationDeliveryAttemptRepository,
} from "../repositories/notification-delivery-attempt.repository";
import type { NotificationRepository } from "../repositories/notification.repository";
import type { AuthenticatedUser } from "@/common/decorators/current-user.decorator";
import type { AuditLogService } from "@/modules/audit/audit-log.service";
import type { CompaniesService } from "@/modules/companies/companies.service";

import { Role } from "@/shared/enums";

const empresaActor: AuthenticatedUser = {
  sub: "user-1",
  tenantId: "company-1",
  role: Role.EMPRESA,
  vinculoId: "vinculo-1",
};

describe("NotificationDashboardService", () => {
  let notificationRepository: jest.Mocked<NotificationRepository>;
  let deliveryAttemptRepository: jest.Mocked<NotificationDeliveryAttemptRepository>;
  let companiesService: jest.Mocked<Pick<CompaniesService, "findByIdOrThrow">>;
  let auditLogService: jest.Mocked<Pick<AuditLogService, "listByCompany">>;
  let service: NotificationDashboardService;

  beforeEach(() => {
    notificationRepository = {
      create: jest.fn(),
      findByIdForUser: jest.fn(),
      findByIdInternal: jest.fn(),
      addChannel: jest.fn(),
      list: jest.fn(),
      markRead: jest.fn(),
      markAllRead: jest.fn(),
      setFavorita: jest.fn(),
      setArquivada: jest.fn(),
      delete: jest.fn(),
      countByCompany: jest.fn(),
      countByPriority: jest.fn(),
      countByType: jest.fn(),
      countByChannel: jest.fn(),
    };
    deliveryAttemptRepository = {
      create: jest.fn(),
      update: jest.fn(),
      findById: jest.fn(),
      listByNotification: jest.fn(),
      statsByCompany: jest.fn(),
    };
    companiesService = { findByIdOrThrow: jest.fn().mockResolvedValue({}) };
    auditLogService = { listByCompany: jest.fn() };

    service = new NotificationDashboardService(
      notificationRepository,
      deliveryAttemptRepository,
      companiesService as unknown as CompaniesService,
      auditLogService as unknown as AuditLogService,
    );
  });

  describe("getDashboard", () => {
    it("verifica o RBAC via CompaniesService.findByIdOrThrow antes de agregar", async () => {
      notificationRepository.countByCompany.mockResolvedValue({
        total: 0,
        lidas: 0,
        favoritadas: 0,
        arquivadas: 0,
      });
      notificationRepository.countByPriority.mockResolvedValue([]);
      notificationRepository.countByType.mockResolvedValue([]);
      notificationRepository.countByChannel.mockResolvedValue([]);
      deliveryAttemptRepository.statsByCompany.mockResolvedValue([]);

      await service.getDashboard("company-1", empresaActor, {});

      expect(companiesService.findByIdOrThrow).toHaveBeenCalledWith("company-1", empresaActor);
    });

    it("propaga o erro do RBAC (404/403) sem agregar nada", async () => {
      companiesService.findByIdOrThrow.mockRejectedValue(new Error("Empresa não encontrada."));
      await expect(service.getDashboard("company-1", empresaActor, {})).rejects.toThrow(
        "Empresa não encontrada.",
      );
      expect(notificationRepository.countByCompany).not.toHaveBeenCalled();
    });

    it("converte desde (string ISO) em Date e repassa a todos os repositórios", async () => {
      notificationRepository.countByCompany.mockResolvedValue({
        total: 0,
        lidas: 0,
        favoritadas: 0,
        arquivadas: 0,
      });
      notificationRepository.countByPriority.mockResolvedValue([]);
      notificationRepository.countByType.mockResolvedValue([]);
      notificationRepository.countByChannel.mockResolvedValue([]);
      deliveryAttemptRepository.statsByCompany.mockResolvedValue([]);

      await service.getDashboard("company-1", empresaActor, { desde: "2026-01-01T00:00:00.000Z" });

      const esperado = new Date("2026-01-01T00:00:00.000Z");
      expect(notificationRepository.countByCompany).toHaveBeenCalledWith("company-1", {
        desde: esperado,
      });
      expect(notificationRepository.countByPriority).toHaveBeenCalledWith("company-1", {
        desde: esperado,
      });
      expect(notificationRepository.countByType).toHaveBeenCalledWith("company-1", {
        desde: esperado,
      });
      expect(notificationRepository.countByChannel).toHaveBeenCalledWith("company-1", {
        desde: esperado,
      });
      expect(deliveryAttemptRepository.statsByCompany).toHaveBeenCalledWith("company-1", {
        desde: esperado,
      });
    });

    it("monta porPrioridade/porTipo/porCanalEscolhido como mapas simples", async () => {
      notificationRepository.countByCompany.mockResolvedValue({
        total: 10,
        lidas: 4,
        favoritadas: 1,
        arquivadas: 2,
      });
      notificationRepository.countByPriority.mockResolvedValue([
        { prioridade: "INFORMATIVA", total: 7 },
        { prioridade: "URGENTE", total: 3 },
      ]);
      notificationRepository.countByType.mockResolvedValue([
        { tipo: "NOVO_ALUNO", total: 5 },
        { tipo: "NOVA_ESCOLA", total: 5 },
      ]);
      notificationRepository.countByChannel.mockResolvedValue([
        { canal: "IN_APP", total: 10 },
        { canal: "PUSH", total: 8 },
      ]);
      deliveryAttemptRepository.statsByCompany.mockResolvedValue([]);

      const resultado = await service.getDashboard("company-1", empresaActor, {});

      expect(resultado.totalEnviadas).toBe(10);
      expect(resultado.lidas).toBe(4);
      expect(resultado.favoritadas).toBe(1);
      expect(resultado.arquivadas).toBe(2);
      expect(resultado.porPrioridade).toEqual({ INFORMATIVA: 7, URGENTE: 3 });
      expect(resultado.porTipo).toEqual({ NOVO_ALUNO: 5, NOVA_ESCOLA: 5 });
      expect(resultado.porCanalEscolhido).toEqual({ IN_APP: 10, PUSH: 8 });
    });

    describe("agregação de entregasPorCanal", () => {
      const buildRows = (rows: DeliveryStatsByCompanyRow[]) => rows;

      beforeEach(() => {
        notificationRepository.countByCompany.mockResolvedValue({
          total: 0,
          lidas: 0,
          favoritadas: 0,
          arquivadas: 0,
        });
        notificationRepository.countByPriority.mockResolvedValue([]);
        notificationRepository.countByType.mockResolvedValue([]);
        notificationRepository.countByChannel.mockResolvedValue([]);
      });

      it("consolida ENTREGUE + LIDA em entregues, FALHOU em falharam, e calcula taxaSucesso", async () => {
        deliveryAttemptRepository.statsByCompany.mockResolvedValue(
          buildRows([
            { canal: "PUSH", status: "ENTREGUE", total: 6, tempoRespostaMedioMs: 100 },
            { canal: "PUSH", status: "LIDA", total: 2, tempoRespostaMedioMs: 200 },
            { canal: "PUSH", status: "FALHOU", total: 2, tempoRespostaMedioMs: null },
          ]),
        );

        const resultado = await service.getDashboard("company-1", empresaActor, {});

        expect(resultado.entregasPorCanal).toEqual([
          {
            canal: "PUSH",
            total: 10,
            entregues: 8,
            falharam: 2,
            taxaSucesso: 0.8,
            tempoRespostaMedioMs: (100 * 6 + 200 * 2) / 8,
          },
        ]);
      });

      it("taxaSucesso é 0 (nunca NaN) quando não há nenhuma tentativa", async () => {
        deliveryAttemptRepository.statsByCompany.mockResolvedValue(
          buildRows([{ canal: "SMS", status: "PENDENTE", total: 0, tempoRespostaMedioMs: null }]),
        );

        const resultado = await service.getDashboard("company-1", empresaActor, {});
        expect(resultado.entregasPorCanal[0]?.taxaSucesso).toBe(0);
      });

      it("tempoRespostaMedioMs é null quando nenhuma entrega tem tempo de resposta registrado", async () => {
        deliveryAttemptRepository.statsByCompany.mockResolvedValue(
          buildRows([
            { canal: "WHATSAPP", status: "ENVIADA", total: 3, tempoRespostaMedioMs: null },
          ]),
        );

        const resultado = await service.getDashboard("company-1", empresaActor, {});
        expect(resultado.entregasPorCanal[0]?.tempoRespostaMedioMs).toBeNull();
      });

      it("mantém canais separados quando há mais de um", async () => {
        deliveryAttemptRepository.statsByCompany.mockResolvedValue(
          buildRows([
            { canal: "PUSH", status: "ENTREGUE", total: 5, tempoRespostaMedioMs: 50 },
            { canal: "EMAIL", status: "FALHOU", total: 1, tempoRespostaMedioMs: null },
          ]),
        );

        const resultado = await service.getDashboard("company-1", empresaActor, {});
        expect(resultado.entregasPorCanal).toHaveLength(2);
        expect(resultado.entregasPorCanal.map((c) => c.canal).sort()).toEqual(["EMAIL", "PUSH"]);
      });
    });
  });

  describe("listAuditLogs", () => {
    it("verifica RBAC e filtra por entidadeTipo Notification", async () => {
      auditLogService.listByCompany.mockResolvedValue({
        items: [
          {
            id: "log-1",
            entidadeTipo: "Notification",
            entidadeId: "notification-1",
            acao: "NOTIFICATION_SENT",
            atorUserId: null,
            dadosAntes: null,
            dadosDepois: { tipo: "NOVO_ALUNO" },
            createdAt: new Date("2026-01-01"),
          } as never,
        ],
        total: 1,
      });

      const resultado = await service.listAuditLogs("company-1", empresaActor, 1, 20);

      expect(companiesService.findByIdOrThrow).toHaveBeenCalledWith("company-1", empresaActor);
      expect(auditLogService.listByCompany).toHaveBeenCalledWith("company-1", {
        entidadeTipo: "Notification",
        page: 1,
        pageSize: 20,
      });
      expect(resultado.total).toBe(1);
      expect(resultado.items[0]?.acao).toBe("NOTIFICATION_SENT");
    });
  });
});

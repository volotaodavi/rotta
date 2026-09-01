import { CompanyStatus, NotificationEventType, type Company } from "@prisma/client";

import { diasAteTrialExpirar, TrialNotificationsService } from "../trial-notifications.service";

import type { PrismaService } from "@/infra/database/prisma.service";
import type { MessagePersonalizationService } from "@/modules/notifications/message-personalization.service";
import type { UsersService } from "@/modules/users/users.service";
import type { EventEmitter2 } from "@nestjs/event-emitter";

function buildCompany(overrides: Partial<Company> = {}): Company {
  return {
    id: "company-1",
    status: CompanyStatus.TRIAL,
    trialExpiraEm: new Date("2026-09-15T12:00:00Z"),
    nomeFantasia: "Transportadora Teste",
    ...overrides,
  } as Company;
}

describe("diasAteTrialExpirar", () => {
  it("conta em dias INTEIROS de calendário, ignorando hora do dia", () => {
    const trialExpiraEm = new Date("2026-09-15T23:00:00Z");
    const referencia = new Date("2026-09-12T01:00:00Z");
    expect(diasAteTrialExpirar(trialExpiraEm, referencia)).toBe(3);
  });

  it("vence hoje -> 0", () => {
    const trialExpiraEm = new Date("2026-09-15T23:00:00Z");
    const referencia = new Date("2026-09-15T01:00:00Z");
    expect(diasAteTrialExpirar(trialExpiraEm, referencia)).toBe(0);
  });

  it("negativo depois de vencido", () => {
    const trialExpiraEm = new Date("2026-09-15T00:00:00Z");
    const referencia = new Date("2026-09-17T00:00:00Z");
    expect(diasAteTrialExpirar(trialExpiraEm, referencia)).toBe(-2);
  });
});

describe("TrialNotificationsService", () => {
  let prisma: { runWithTenantContext: jest.Mock; company: { findMany: jest.Mock } };
  let usersService: jest.Mocked<Pick<UsersService, "listMembershipsByCompany">>;
  let messagePersonalizationService: jest.Mocked<
    Pick<MessagePersonalizationService, "trialExpirando" | "trialVenceHoje" | "trialBloqueado">
  >;
  let eventEmitter: jest.Mocked<Pick<EventEmitter2, "emit">>;
  let service: TrialNotificationsService;

  beforeEach(() => {
    prisma = {
      runWithTenantContext: jest.fn((_ctx: unknown, fn: () => unknown) => fn()),
      company: { findMany: jest.fn().mockResolvedValue([]) },
    };
    usersService = {
      listMembershipsByCompany: jest.fn().mockResolvedValue([
        { userId: "user-empresa", role: "empresa" },
        { userId: "user-gestor", role: "gestor" },
        { userId: "user-motorista", role: "motorista" },
      ]),
    };
    messagePersonalizationService = {
      trialExpirando: jest.fn().mockReturnValue({ titulo: "Expirando", corpo: "..." }),
      trialVenceHoje: jest.fn().mockReturnValue({ titulo: "Vence hoje", corpo: "..." }),
      trialBloqueado: jest.fn().mockReturnValue({ titulo: "Bloqueado", corpo: "..." }),
    };
    eventEmitter = { emit: jest.fn() };

    service = new TrialNotificationsService(
      prisma as unknown as PrismaService,
      usersService as unknown as UsersService,
      messagePersonalizationService as unknown as MessagePersonalizationService,
      eventEmitter as unknown as EventEmitter2,
    );
  });

  describe("resolveEvento", () => {
    it("3 dias -> TRIAL_EXPIRANDO", () => {
      expect(service.resolveEvento(3)).toBe(NotificationEventType.TRIAL_EXPIRANDO);
    });
    it("0 dias -> TRIAL_VENCE_HOJE", () => {
      expect(service.resolveEvento(0)).toBe(NotificationEventType.TRIAL_VENCE_HOJE);
    });
    it("-2 dias (TRIAL_GRACE_DAYS=1 + 1) -> TRIAL_BLOQUEADO", () => {
      expect(service.resolveEvento(-2)).toBe(NotificationEventType.TRIAL_BLOQUEADO);
    });
    it("qualquer outro dia -> null (nunca notifica duas vezes)", () => {
      expect(service.resolveEvento(2)).toBeNull();
      expect(service.resolveEvento(1)).toBeNull();
      expect(service.resolveEvento(-1)).toBeNull();
      expect(service.resolveEvento(-3)).toBeNull();
    });
  });

  describe("avaliarTodasAsEmpresas", () => {
    it("notifica só Empresa/Gestor (nunca Motorista/Monitor) quando bate um marco", async () => {
      prisma.company.findMany.mockResolvedValue([
        buildCompany({ trialExpiraEm: new Date("2026-09-04T12:00:00Z") }),
      ]);
      const referencia = new Date("2026-09-01T12:00:00Z"); // 3 dias antes

      const { notificadas } = await service.avaliarTodasAsEmpresas(referencia);

      expect(notificadas).toBe(1);
      expect(messagePersonalizationService.trialExpirando).toHaveBeenCalledWith(3);
      expect(eventEmitter.emit).toHaveBeenCalledTimes(2);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        "communication.requested",
        expect.objectContaining({
          userId: "user-empresa",
          tipo: NotificationEventType.TRIAL_EXPIRANDO,
        }),
      );
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        "communication.requested",
        expect.objectContaining({
          userId: "user-gestor",
          tipo: NotificationEventType.TRIAL_EXPIRANDO,
        }),
      );
      expect(eventEmitter.emit).not.toHaveBeenCalledWith(
        "communication.requested",
        expect.objectContaining({ userId: "user-motorista" }),
      );
    });

    it("empresa fora de qualquer marco não é notificada", async () => {
      prisma.company.findMany.mockResolvedValue([
        buildCompany({ trialExpiraEm: new Date("2026-09-20T12:00:00Z") }),
      ]);
      const { notificadas } = await service.avaliarTodasAsEmpresas(
        new Date("2026-09-01T12:00:00Z"),
      );

      expect(notificadas).toBe(0);
      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });

    it("consulta empresas com bypass cross-tenant (webhook/job, não requisição autenticada)", async () => {
      await service.avaliarTodasAsEmpresas();
      expect(prisma.runWithTenantContext).toHaveBeenCalledWith(
        { tenantId: null, bypass: true },
        expect.any(Function),
      );
    });
  });
});

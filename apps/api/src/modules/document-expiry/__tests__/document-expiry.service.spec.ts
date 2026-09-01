import { DriverDocumentType, NotificationEventType, VehicleDocumentType } from "@prisma/client";

import { DocumentExpiryService } from "../document-expiry.service";

import type { PrismaService } from "@/infra/database/prisma.service";
import type { MessagePersonalizationService } from "@/modules/notifications/message-personalization.service";
import type { UsersService } from "@/modules/users/users.service";
import type { EventEmitter2 } from "@nestjs/event-emitter";

describe("DocumentExpiryService", () => {
  let prisma: {
    runWithTenantContext: jest.Mock;
    driverDocument: { findMany: jest.Mock };
    vehicleDocument: { findMany: jest.Mock };
  };
  let usersService: jest.Mocked<Pick<UsersService, "listMembershipsByCompany">>;
  let messagePersonalizationService: jest.Mocked<
    Pick<MessagePersonalizationService, "cnhVencendo" | "documentoVencendo">
  >;
  let eventEmitter: jest.Mocked<Pick<EventEmitter2, "emit">>;
  let service: DocumentExpiryService;

  beforeEach(() => {
    prisma = {
      runWithTenantContext: jest.fn((_ctx: unknown, fn: () => unknown) => fn()),
      driverDocument: { findMany: jest.fn().mockResolvedValue([]) },
      vehicleDocument: { findMany: jest.fn().mockResolvedValue([]) },
    };
    usersService = {
      listMembershipsByCompany: jest.fn().mockResolvedValue([
        { userId: "user-empresa", role: "empresa" },
        { userId: "user-motorista", role: "motorista" },
      ]),
    };
    messagePersonalizationService = {
      cnhVencendo: jest.fn().mockReturnValue({ titulo: "CNH", corpo: "..." }),
      documentoVencendo: jest.fn().mockReturnValue({ titulo: "Documento", corpo: "..." }),
    };
    eventEmitter = { emit: jest.fn() };

    service = new DocumentExpiryService(
      prisma as unknown as PrismaService,
      usersService as unknown as UsersService,
      messagePersonalizationService as unknown as MessagePersonalizationService,
      eventEmitter as unknown as EventEmitter2,
    );
  });

  it("CNH vencendo em 30 dias: notifica o motorista E Empresa/Gestor, nunca Motorista/Monitor duplicado por engano", async () => {
    const vencimentoEm = new Date();
    vencimentoEm.setUTCDate(vencimentoEm.getUTCDate() + 30);
    prisma.driverDocument.findMany.mockResolvedValue([
      {
        id: "doc-1",
        userId: "motorista-1",
        companyId: "company-1",
        tipo: DriverDocumentType.CNH,
        vencimentoEm,
        user: { nome: "João Motorista" },
      },
    ]);

    const { notificados } = await service.avaliarTodosOsDocumentos();

    expect(notificados).toBe(1);
    expect(messagePersonalizationService.cnhVencendo).toHaveBeenCalledWith("João Motorista", 30);
    // Motorista (dono do documento) + o membro Empresa (não o membro "motorista" da empresa, que é outra pessoa).
    expect(eventEmitter.emit).toHaveBeenCalledTimes(2);
    expect(eventEmitter.emit).toHaveBeenCalledWith(
      "communication.requested",
      expect.objectContaining({ userId: "motorista-1", tipo: NotificationEventType.CNH_VENCENDO }),
    );
    expect(eventEmitter.emit).toHaveBeenCalledWith(
      "communication.requested",
      expect.objectContaining({ userId: "user-empresa", tipo: NotificationEventType.CNH_VENCENDO }),
    );
  });

  it("documento de veículo vencendo em 7 dias: só Empresa/Gestor, DOCUMENTO_VENCENDO", async () => {
    const vencimentoEm = new Date();
    vencimentoEm.setUTCDate(vencimentoEm.getUTCDate() + 7);
    prisma.vehicleDocument.findMany.mockResolvedValue([
      { id: "doc-2", companyId: "company-1", tipo: VehicleDocumentType.SEGURO, vencimentoEm },
    ]);

    const { notificados } = await service.avaliarTodosOsDocumentos();

    expect(notificados).toBe(1);
    expect(messagePersonalizationService.documentoVencendo).toHaveBeenCalledWith("Seguro", 7);
    expect(eventEmitter.emit).toHaveBeenCalledTimes(1);
    expect(eventEmitter.emit).toHaveBeenCalledWith(
      "communication.requested",
      expect.objectContaining({
        userId: "user-empresa",
        tipo: NotificationEventType.DOCUMENTO_VENCENDO,
      }),
    );
  });

  it("fora dos marcos de 30/7 dias, nunca notifica", async () => {
    const vencimentoEm = new Date();
    vencimentoEm.setUTCDate(vencimentoEm.getUTCDate() + 15);
    prisma.driverDocument.findMany.mockResolvedValue([
      {
        id: "doc-3",
        userId: "motorista-1",
        companyId: "company-1",
        tipo: DriverDocumentType.CNH,
        vencimentoEm,
        user: { nome: "João" },
      },
    ]);

    const { notificados } = await service.avaliarTodosOsDocumentos();

    expect(notificados).toBe(0);
    expect(eventEmitter.emit).not.toHaveBeenCalled();
  });

  it("consulta com bypass cross-tenant (job, não requisição autenticada)", async () => {
    await service.avaliarTodosOsDocumentos();
    expect(prisma.runWithTenantContext).toHaveBeenCalledWith(
      { tenantId: null, bypass: true },
      expect.any(Function),
    );
  });
});

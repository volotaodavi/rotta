import { AnnouncementAudience } from "@prisma/client";

import { AnnouncementsService } from "../announcements.service";

import type {
  AnnouncementRepository,
  AnnouncementWithAutor,
} from "../repositories/announcement.repository";
import type { AuthenticatedUser } from "@/common/decorators/current-user.decorator";
import type { MessagePersonalizationService } from "@/modules/notifications/message-personalization.service";
import type { UsersService } from "@/modules/users/users.service";
import type { EventEmitter2 } from "@nestjs/event-emitter";

import { COMMUNICATION_REQUESTED_EVENT } from "@/modules/notifications/events/communication-requested.event";
import { Role } from "@/shared/enums";

function buildAnnouncement(overrides: Partial<AnnouncementWithAutor> = {}): AnnouncementWithAutor {
  return {
    id: "announcement-1",
    titulo: "Manutenção programada",
    corpo: "O app ficará indisponível das 2h às 3h de domingo.",
    publico: "TODOS",
    criadoPorUserId: "admin-1",
    criadoPor: { id: "admin-1", nome: "Suporte Rotta" },
    destinatariosCount: 3,
    createdAt: new Date(),
    ...overrides,
  };
}

const adminActor: AuthenticatedUser = {
  sub: "admin-1",
  tenantId: null,
  role: Role.ADMIN_ROTTA,
  vinculoId: "vinculo-1",
};

describe("AnnouncementsService", () => {
  let service: AnnouncementsService;
  let announcementRepository: jest.Mocked<AnnouncementRepository>;
  let usersService: jest.Mocked<UsersService>;
  let eventEmitter: jest.Mocked<EventEmitter2>;
  let messagePersonalizationService: jest.Mocked<MessagePersonalizationService>;

  beforeEach(() => {
    announcementRepository = { create: jest.fn(), list: jest.fn() };
    usersService = {
      listAllActiveUserIds: jest.fn().mockResolvedValue(["user-1", "user-2", "user-3"]),
      listActiveUserIdsByRoles: jest.fn().mockResolvedValue(["empresa-1"]),
      listResponsavelUserIds: jest.fn().mockResolvedValue(["responsavel-1"]),
    } as unknown as jest.Mocked<UsersService>;
    eventEmitter = { emit: jest.fn() } as unknown as jest.Mocked<EventEmitter2>;
    messagePersonalizationService = {
      avisoGeral: jest
        .fn()
        .mockImplementation((titulo: string, corpo: string) => ({ titulo, corpo })),
    } as unknown as jest.Mocked<MessagePersonalizationService>;

    service = new AnnouncementsService(
      announcementRepository,
      usersService,
      eventEmitter,
      messagePersonalizationService,
    );
  });

  describe("create", () => {
    it("resolve os destinatários do público TODOS e notifica cada um", async () => {
      announcementRepository.create.mockResolvedValue(buildAnnouncement({ destinatariosCount: 3 }));

      const result = await service.create(
        {
          titulo: "Manutenção programada",
          corpo: "O app ficará indisponível das 2h às 3h.",
          publico: AnnouncementAudience.TODOS,
        },
        adminActor,
      );

      expect(usersService.listAllActiveUserIds).toHaveBeenCalled();
      expect(announcementRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ publico: AnnouncementAudience.TODOS, destinatariosCount: 3 }),
      );
      expect(eventEmitter.emit).toHaveBeenCalledTimes(3);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        COMMUNICATION_REQUESTED_EVENT,
        expect.objectContaining({ userId: "user-1", tipo: "AVISO_GERAL" }),
      );
      expect(result.destinatariosCount).toBe(3);
    });

    it("público EMPRESAS resolve só Empresa/Gestor", async () => {
      announcementRepository.create.mockResolvedValue(
        buildAnnouncement({ publico: "EMPRESAS", destinatariosCount: 1 }),
      );

      await service.create(
        {
          titulo: "Novidade pro seu negócio",
          corpo: "Lançamos uma nova funcionalidade.",
          publico: AnnouncementAudience.EMPRESAS,
        },
        adminActor,
      );

      expect(usersService.listActiveUserIdsByRoles).toHaveBeenCalledWith([
        Role.EMPRESA,
        Role.GESTOR,
      ]);
      expect(usersService.listAllActiveUserIds).not.toHaveBeenCalled();
    });

    it("público RESPONSAVEIS resolve só Responsáveis", async () => {
      announcementRepository.create.mockResolvedValue(
        buildAnnouncement({ publico: "RESPONSAVEIS", destinatariosCount: 1 }),
      );

      await service.create(
        {
          titulo: "Aviso pros pais",
          corpo: "Novo recurso de acompanhamento.",
          publico: AnnouncementAudience.RESPONSAVEIS,
        },
        adminActor,
      );

      expect(usersService.listResponsavelUserIds).toHaveBeenCalled();
    });

    it("uma falha isolada no fan-out nunca derruba a publicação", async () => {
      announcementRepository.create.mockResolvedValue(buildAnnouncement({ destinatariosCount: 3 }));
      eventEmitter.emit.mockImplementationOnce(() => {
        throw new Error("boom");
      });

      const result = await service.create(
        {
          titulo: "Manutenção programada",
          corpo: "O app ficará indisponível das 2h às 3h.",
          publico: AnnouncementAudience.TODOS,
        },
        adminActor,
      );

      expect(result.id).toBe("announcement-1");
      expect(eventEmitter.emit).toHaveBeenCalledTimes(3);
    });
  });

  describe("list", () => {
    it("retorna o histórico paginado, mais recente primeiro (ordenação é responsabilidade do repositório)", async () => {
      announcementRepository.list.mockResolvedValue({ items: [buildAnnouncement()], total: 1 });

      const result = await service.list({ page: 1, pageSize: 20 });

      expect(announcementRepository.list).toHaveBeenCalledWith({ page: 1, pageSize: 20 });
      expect(result.total).toBe(1);
      expect(result.items).toHaveLength(1);
      expect(result.items[0]?.criadoPorNome).toBe("Suporte Rotta");
    });
  });
});

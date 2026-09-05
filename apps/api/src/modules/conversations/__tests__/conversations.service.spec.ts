import { ForbiddenException, NotFoundException } from "@nestjs/common";

import { ConversationsService } from "../conversations.service";

import type { ConversationRepository } from "../repositories/conversation.repository";
import type { AuthenticatedUser } from "@/common/decorators/current-user.decorator";
import type { PrismaService } from "@/infra/database/prisma.service";
import type { AuditLogService } from "@/modules/audit/audit-log.service";
import type { MessagePersonalizationService } from "@/modules/notifications/message-personalization.service";
import type { UsersService } from "@/modules/users/users.service";
import type { EventEmitter2 } from "@nestjs/event-emitter";
import type { Contract } from "@prisma/client";

import { Role } from "@/shared/enums";

function buildContract(overrides: Partial<Contract> = {}): Contract {
  return {
    id: "contract-1",
    responsavelId: "responsavel-1",
    motoristaId: "motorista-1",
    monitorId: "monitor-1",
    companyId: "company-1",
    ...overrides,
  } as unknown as Contract;
}

const responsavelActor: AuthenticatedUser = {
  sub: "responsavel-1",
  tenantId: null,
  role: Role.RESPONSAVEL,
  vinculoId: "responsavel-1",
};

const motoristaActor: AuthenticatedUser = {
  sub: "motorista-1",
  tenantId: "company-1",
  role: Role.MOTORISTA,
  vinculoId: "vinculo-motorista",
};

const monitorActor: AuthenticatedUser = {
  sub: "monitor-1",
  tenantId: "company-1",
  role: Role.MONITOR,
  vinculoId: "vinculo-monitor",
};

const outroMotoristaActor: AuthenticatedUser = {
  sub: "motorista-outro",
  tenantId: "company-1",
  role: Role.MOTORISTA,
  vinculoId: "vinculo-outro",
};

const adminActor: AuthenticatedUser = {
  sub: "admin-1",
  tenantId: null,
  role: Role.ADMIN_ROTTA,
  vinculoId: "admin-1",
};

describe("ConversationsService", () => {
  let service: ConversationsService;
  let repository: jest.Mocked<ConversationRepository>;
  let contractFindUnique: jest.Mock;
  let prisma: jest.Mocked<PrismaService>;
  let auditLogService: jest.Mocked<AuditLogService>;
  let eventEmitter: jest.Mocked<EventEmitter2>;
  let messagePersonalizationService: jest.Mocked<
    Pick<MessagePersonalizationService, "novaMensagemConversa">
  >;
  let usersService: jest.Mocked<Pick<UsersService, "findById">>;

  beforeEach(() => {
    repository = {
      findByContractId: jest.fn(),
      create: jest.fn(),
      createMessage: jest.fn(),
      listMessages: jest.fn(),
      countUnread: jest.fn().mockResolvedValue(0),
      markAllAsRead: jest.fn().mockResolvedValue(0),
    };
    contractFindUnique = jest.fn().mockResolvedValue(buildContract());
    prisma = {
      withBypass: jest.fn((operation: unknown) => operation),
      contract: { findUnique: contractFindUnique },
    } as unknown as jest.Mocked<PrismaService>;
    auditLogService = {
      record: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<AuditLogService>;
    eventEmitter = { emit: jest.fn() } as unknown as jest.Mocked<EventEmitter2>;
    messagePersonalizationService = {
      novaMensagemConversa: jest
        .fn()
        .mockReturnValue({ titulo: "Nova mensagem de Fulano", corpo: "Oi" }),
    };
    usersService = { findById: jest.fn().mockResolvedValue({ nome: "Fulano" }) };

    service = new ConversationsService(
      repository,
      prisma,
      auditLogService,
      eventEmitter,
      messagePersonalizationService as unknown as MessagePersonalizationService,
      usersService as unknown as UsersService,
    );
  });

  describe("RBAC — quem é participante do contrato", () => {
    it("rejeita quando o contrato não existe", async () => {
      contractFindUnique.mockResolvedValue(null);

      await expect(service.getConversation("contract-1", responsavelActor)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("permite o Responsável dono do contrato", async () => {
      repository.findByContractId.mockResolvedValue({
        id: "conv-1",
        contractId: "contract-1",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.getConversation("contract-1", responsavelActor);
      expect(result.id).toBe("conv-1");
    });

    it("permite o Motorista ATUAL do contrato", async () => {
      repository.findByContractId.mockResolvedValue({
        id: "conv-1",
        contractId: "contract-1",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(service.getConversation("contract-1", motoristaActor)).resolves.toMatchObject({
        id: "conv-1",
      });
    });

    it("permite o Monitor ATUAL do contrato", async () => {
      repository.findByContractId.mockResolvedValue({
        id: "conv-1",
        contractId: "contract-1",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(service.getConversation("contract-1", monitorActor)).resolves.toMatchObject({
        id: "conv-1",
      });
    });

    it("rejeita um Motorista que não está vinculado a ESTE contrato (mesmo sendo Motorista de outra rota)", async () => {
      await expect(service.getConversation("contract-1", outroMotoristaActor)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it("permite Admin Rotta ler, mas rejeita Admin Rotta enviando mensagem (nunca escreve no lugar de uma das partes)", async () => {
      repository.findByContractId.mockResolvedValue({
        id: "conv-1",
        contractId: "contract-1",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(service.getConversation("contract-1", adminActor)).resolves.toMatchObject({
        id: "conv-1",
      });
      await expect(
        service.sendMessage("contract-1", { mensagem: "oi" }, adminActor, {}),
      ).rejects.toThrow(ForbiddenException);
    });

    it("um Motorista substituído (não é mais o motoristaId atual do contrato) perde acesso, sem nenhuma ação própria do módulo", async () => {
      // O contrato já foi reatribuído — `motoristaId` agora é outro.
      contractFindUnique.mockResolvedValue(buildContract({ motoristaId: "motorista-novo" }));

      await expect(service.getConversation("contract-1", motoristaActor)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe("sendMessage", () => {
    it("cria a conversa sob demanda na primeira mensagem", async () => {
      repository.findByContractId.mockResolvedValue(null);
      repository.create.mockResolvedValue({
        id: "conv-novo",
        contractId: "contract-1",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      repository.createMessage.mockResolvedValue({
        id: "msg-1",
        conversationId: "conv-novo",
        autorUserId: "responsavel-1",
        autorRole: "RESPONSAVEL",
        mensagem: "Oi, tudo bem?",
        lidaEm: null,
        createdAt: new Date(),
        autor: { nome: "Maria" },
      });

      const result = await service.sendMessage(
        "contract-1",
        { mensagem: "Oi, tudo bem?" },
        responsavelActor,
        {},
      );

      expect(repository.create).toHaveBeenCalledWith("contract-1");
      expect(repository.createMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          conversationId: "conv-novo",
          autorUserId: "responsavel-1",
          autorRole: "RESPONSAVEL",
        }),
      );
      expect(result.souEu).toBe(true);
      expect(result.autorNome).toBe("Maria");
    });

    it("Responsável enviando notifica MOTORISTA e MONITOR (os dois, se houver)", async () => {
      repository.findByContractId.mockResolvedValue({
        id: "conv-1",
        contractId: "contract-1",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      repository.createMessage.mockResolvedValue({
        id: "msg-1",
        conversationId: "conv-1",
        autorUserId: "responsavel-1",
        autorRole: "RESPONSAVEL",
        mensagem: "Oi",
        lidaEm: null,
        createdAt: new Date(),
        autor: { nome: "Maria" },
      });

      await service.sendMessage("contract-1", { mensagem: "Oi" }, responsavelActor, {});

      expect(eventEmitter.emit).toHaveBeenCalledTimes(2);
      const destinatarios = eventEmitter.emit.mock.calls.map(
        (call) => (call[1] as never)["userId"],
      );
      expect(destinatarios.sort()).toEqual(["monitor-1", "motorista-1"]);
    });

    it("Motorista/Monitor enviando notifica só o Responsável", async () => {
      repository.findByContractId.mockResolvedValue({
        id: "conv-1",
        contractId: "contract-1",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      repository.createMessage.mockResolvedValue({
        id: "msg-1",
        conversationId: "conv-1",
        autorUserId: "motorista-1",
        autorRole: "MOTORISTA",
        mensagem: "Chegando em 5 min",
        lidaEm: null,
        createdAt: new Date(),
        autor: { nome: "João" },
      });

      await service.sendMessage(
        "contract-1",
        { mensagem: "Chegando em 5 min" },
        motoristaActor,
        {},
      );

      expect(eventEmitter.emit).toHaveBeenCalledTimes(1);
      const [, payload] = eventEmitter.emit.mock.calls[0] as [string, { userId: string }];
      expect(payload.userId).toBe("responsavel-1");
    });

    it("nunca lança mesmo se a notificação falhar (best-effort, mensagem já foi salva)", async () => {
      repository.findByContractId.mockResolvedValue({
        id: "conv-1",
        contractId: "contract-1",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      repository.createMessage.mockResolvedValue({
        id: "msg-1",
        conversationId: "conv-1",
        autorUserId: "responsavel-1",
        autorRole: "RESPONSAVEL",
        mensagem: "Oi",
        lidaEm: null,
        createdAt: new Date(),
        autor: { nome: "Maria" },
      });
      usersService.findById.mockRejectedValue(new Error("indisponível"));

      await expect(
        service.sendMessage("contract-1", { mensagem: "Oi" }, responsavelActor, {}),
      ).resolves.toMatchObject({ id: "msg-1" });
    });
  });

  describe("markAsRead", () => {
    it("é um no-op quando ainda não existe conversa", async () => {
      repository.findByContractId.mockResolvedValue(null);

      await service.markAsRead("contract-1", responsavelActor);

      expect(repository.markAllAsRead).not.toHaveBeenCalled();
    });

    it("marca como lidas as mensagens que não são do próprio ator", async () => {
      repository.findByContractId.mockResolvedValue({
        id: "conv-1",
        contractId: "contract-1",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await service.markAsRead("contract-1", responsavelActor);

      expect(repository.markAllAsRead).toHaveBeenCalledWith("conv-1", "responsavel-1");
    });
  });
});

import { ForbiddenException, NotFoundException } from "@nestjs/common";

import { SupportService } from "../support.service";

import type { SupportMessageRepository } from "../repositories/support-message.repository";
import type {
  SupportTicketRepository,
  SupportTicketWithRelations,
} from "../repositories/support-ticket.repository";
import type { AuthenticatedUser } from "@/common/decorators/current-user.decorator";
import type { EmailService } from "@/infra/email/email.service";
import type { AuditLogService } from "@/modules/audit/audit-log.service";
import type { MessagePersonalizationService } from "@/modules/notifications/message-personalization.service";
import type { UsersService } from "@/modules/users/users.service";
import type { EventEmitter2 } from "@nestjs/event-emitter";

import { COMMUNICATION_REQUESTED_EVENT } from "@/modules/notifications/events/communication-requested.event";
import { Role } from "@/shared/enums";

function buildTicket(
  overrides: Partial<SupportTicketWithRelations> = {},
): SupportTicketWithRelations {
  return {
    id: "ticket-1",
    companyId: "company-1",
    abertoPorUserId: "gestor-1",
    assunto: "Não recebo notificações",
    descricao: "As notificações de embarque pararam de chegar hoje de manhã.",
    categoria: "PROBLEMA_TECNICO",
    status: "ABERTO",
    anexoUrl: null,
    encerradoEm: null,
    encerradoPorUserId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    company: { id: "company-1", nomeFantasia: "Transportes Silva", cpfCnpj: "00000000000100" },
    abertoPor: { id: "gestor-1", nome: "Maria Gestora", email: "maria@empresa.test" },
    encerradoPor: null,
    ...overrides,
  };
}

const empresaActor: AuthenticatedUser = {
  sub: "gestor-1",
  tenantId: "company-1",
  role: Role.EMPRESA,
  vinculoId: "vinculo-1",
};

const outraEmpresaActor: AuthenticatedUser = {
  sub: "gestor-2",
  tenantId: "company-2",
  role: Role.EMPRESA,
  vinculoId: "vinculo-2",
};

const adminActor: AuthenticatedUser = {
  sub: "admin-1",
  tenantId: null,
  role: Role.ADMIN_ROTTA,
  vinculoId: "vinculo-3",
};

const motoristaActor: AuthenticatedUser = {
  sub: "driver-1",
  tenantId: "company-1",
  role: Role.MOTORISTA,
  vinculoId: "vinculo-4",
};

describe("SupportService", () => {
  let service: SupportService;
  let ticketRepository: jest.Mocked<SupportTicketRepository>;
  let messageRepository: jest.Mocked<SupportMessageRepository>;
  let auditLogService: jest.Mocked<AuditLogService>;
  let usersService: jest.Mocked<UsersService>;
  let eventEmitter: jest.Mocked<EventEmitter2>;
  let messagePersonalizationService: jest.Mocked<MessagePersonalizationService>;
  let emailService: jest.Mocked<EmailService>;
  const originalEnv = { ...process.env };

  beforeEach(() => {
    ticketRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      list: jest.fn(),
      updateStatus: jest.fn(),
    };
    messageRepository = { create: jest.fn(), listByTicket: jest.fn() };
    auditLogService = { record: jest.fn() } as unknown as jest.Mocked<AuditLogService>;
    usersService = {
      findById: jest.fn().mockResolvedValue({ id: "admin-1", nome: "Suporte Rotta" }),
      listAdminRottaUserIds: jest.fn().mockResolvedValue(["admin-1", "admin-2"]),
    } as unknown as jest.Mocked<UsersService>;
    eventEmitter = { emit: jest.fn() } as unknown as jest.Mocked<EventEmitter2>;
    messagePersonalizationService = {
      suporteTicketAberto: jest
        .fn()
        .mockReturnValue({ titulo: "Novo chamado de suporte", corpo: "corpo do chamado" }),
      suporteNovaMensagem: jest
        .fn()
        .mockReturnValue({ titulo: "Nova mensagem", corpo: "corpo da mensagem" }),
    } as unknown as jest.Mocked<MessagePersonalizationService>;
    emailService = {
      sendEmail: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<EmailService>;

    delete process.env.SUPPORT_INBOX_EMAIL;
    delete process.env.ADMIN_APP_URL;

    service = new SupportService(
      ticketRepository,
      messageRepository,
      auditLogService,
      usersService,
      eventEmitter,
      messagePersonalizationService,
      emailService,
    );
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe("createTicket", () => {
    it("cria um chamado para Empresa/Gestor na própria empresa", async () => {
      ticketRepository.create.mockResolvedValue(buildTicket());

      const result = await service.createTicket(
        {
          assunto: "Não recebo notificações",
          descricao: "Detalhe suficiente.",
          categoria: "PROBLEMA_TECNICO",
        },
        empresaActor,
        {},
      );

      expect(ticketRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ companyId: "company-1", abertoPorUserId: "gestor-1" }),
      );
      expect(result.status).toBe("ABERTO");
    });

    it("rejeita quando o ator não é Empresa/Gestor", async () => {
      await expect(
        service.createTicket(
          { assunto: "x", descricao: "detalhe suficiente aqui", categoria: "DUVIDA" },
          motoristaActor,
          {},
        ),
      ).rejects.toThrow(ForbiddenException);
      expect(ticketRepository.create).not.toHaveBeenCalled();
    });

    it("notifica todo Admin Rotta (evento) ao abrir um chamado", async () => {
      ticketRepository.create.mockResolvedValue(buildTicket());

      await service.createTicket(
        {
          assunto: "Não recebo notificações",
          descricao: "Detalhe suficiente.",
          categoria: "PROBLEMA_TECNICO",
        },
        empresaActor,
        {},
      );

      expect(usersService.listAdminRottaUserIds).toHaveBeenCalled();
      expect(messagePersonalizationService.suporteTicketAberto).toHaveBeenCalledWith(
        "Não recebo notificações",
        "Maria Gestora",
        "Transportes Silva",
      );
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        COMMUNICATION_REQUESTED_EVENT,
        expect.objectContaining({ userId: "admin-1", tipo: "SUPORTE_TICKET_ABERTO" }),
      );
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        COMMUNICATION_REQUESTED_EVENT,
        expect.objectContaining({ userId: "admin-2", tipo: "SUPORTE_TICKET_ABERTO" }),
      );
    });

    it("envia e-mail pra caixa de suporte quando SUPPORT_INBOX_EMAIL está configurado", async () => {
      process.env.SUPPORT_INBOX_EMAIL = "rottadobrasil@gmail.com";
      ticketRepository.create.mockResolvedValue(buildTicket());

      await service.createTicket(
        {
          assunto: "Não recebo notificações",
          descricao: "Detalhe suficiente.",
          categoria: "PROBLEMA_TECNICO",
        },
        empresaActor,
        {},
      );

      expect(emailService.sendEmail).toHaveBeenCalledWith(
        "rottadobrasil@gmail.com",
        expect.any(String),
        expect.any(String),
      );
    });

    it("não envia e-mail quando SUPPORT_INBOX_EMAIL não está configurado", async () => {
      ticketRepository.create.mockResolvedValue(buildTicket());

      await service.createTicket(
        {
          assunto: "Não recebo notificações",
          descricao: "Detalhe suficiente.",
          categoria: "PROBLEMA_TECNICO",
        },
        empresaActor,
        {},
      );

      expect(emailService.sendEmail).not.toHaveBeenCalled();
    });

    it("nunca deixa uma falha na notificação derrubar a criação do chamado", async () => {
      ticketRepository.create.mockResolvedValue(buildTicket());
      usersService.listAdminRottaUserIds.mockRejectedValue(new Error("boom"));

      const result = await service.createTicket(
        {
          assunto: "Não recebo notificações",
          descricao: "Detalhe suficiente.",
          categoria: "PROBLEMA_TECNICO",
        },
        empresaActor,
        {},
      );

      expect(result.status).toBe("ABERTO");
    });
  });

  describe("listTickets", () => {
    it("Empresa/Gestor só lista o próprio tenant, mesmo se tentar informar outro companyId", async () => {
      ticketRepository.list.mockResolvedValue({ items: [buildTicket()], total: 1 });

      await service.listTickets({ page: 1, pageSize: 20, companyId: "company-999" }, empresaActor);

      expect(ticketRepository.list).toHaveBeenCalledWith(
        expect.objectContaining({ companyId: "company-1" }),
      );
    });

    it("Admin Rotta sem filtro lista cross-tenant (companyId undefined)", async () => {
      ticketRepository.list.mockResolvedValue({ items: [], total: 0 });

      await service.listTickets({ page: 1, pageSize: 20 }, adminActor);

      expect(ticketRepository.list).toHaveBeenCalledWith(
        expect.objectContaining({ companyId: undefined }),
      );
    });
  });

  describe("getTicketDetail", () => {
    it("retorna 404 quando o chamado não existe no escopo do ator", async () => {
      ticketRepository.findById.mockResolvedValue(null);

      await expect(service.getTicketDetail("ticket-1", empresaActor)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("Empresa de outro tenant nunca enxerga o chamado (escopo aplicado na busca)", async () => {
      ticketRepository.findById.mockResolvedValue(null);

      await expect(service.getTicketDetail("ticket-1", outraEmpresaActor)).rejects.toThrow(
        NotFoundException,
      );
      expect(ticketRepository.findById).toHaveBeenCalledWith("ticket-1", "company-2");
    });
  });

  describe("addMessage", () => {
    it("reabre automaticamente um chamado ENCERRADO ao receber nova mensagem", async () => {
      ticketRepository.findById.mockResolvedValue(buildTicket({ status: "ENCERRADO" }));
      messageRepository.create.mockResolvedValue({
        id: "msg-1",
        ticketId: "ticket-1",
        companyId: "company-1",
        autorUserId: "gestor-1",
        autorIsAdminRotta: false,
        mensagem: "Ainda está acontecendo.",
        anexoUrl: null,
        createdAt: new Date(),
        autor: { id: "gestor-1", nome: "Maria Gestora" },
      });

      await service.addMessage(
        "ticket-1",
        { mensagem: "Ainda está acontecendo." },
        empresaActor,
        {},
      );

      expect(ticketRepository.updateStatus).toHaveBeenCalledWith(
        "ticket-1",
        expect.objectContaining({ status: "EM_ANDAMENTO", encerradoEm: null }),
      );
      expect(auditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({ acao: "SUPPORT_TICKET_REOPENED" }),
      );
    });

    it("marca EM_ANDAMENTO quando o Admin Rotta responde um chamado ABERTO", async () => {
      ticketRepository.findById.mockResolvedValue(buildTicket({ status: "ABERTO" }));
      messageRepository.create.mockResolvedValue({
        id: "msg-2",
        ticketId: "ticket-1",
        companyId: "company-1",
        autorUserId: "admin-1",
        autorIsAdminRotta: true,
        mensagem: "Vamos verificar.",
        anexoUrl: null,
        createdAt: new Date(),
        autor: { id: "admin-1", nome: "Suporte Rotta" },
      });

      await service.addMessage(
        "ticket-1",
        { mensagem: "Vamos verificar." },
        adminActor,
        {},
        "company-1",
      );

      expect(ticketRepository.updateStatus).toHaveBeenCalledWith("ticket-1", {
        status: "EM_ANDAMENTO",
      });
    });

    it("não altera o status quando a mensagem é da própria Empresa em um chamado ABERTO", async () => {
      ticketRepository.findById.mockResolvedValue(buildTicket({ status: "ABERTO" }));
      messageRepository.create.mockResolvedValue({
        id: "msg-3",
        ticketId: "ticket-1",
        companyId: "company-1",
        autorUserId: "gestor-1",
        autorIsAdminRotta: false,
        mensagem: "Complementando...",
        anexoUrl: null,
        createdAt: new Date(),
        autor: { id: "gestor-1", nome: "Maria Gestora" },
      });

      await service.addMessage("ticket-1", { mensagem: "Complementando..." }, empresaActor, {});

      expect(ticketRepository.updateStatus).not.toHaveBeenCalled();
    });

    it("Admin Rotta responde → notifica só o tenant que abriu o chamado, sem e-mail pra caixa fixa", async () => {
      ticketRepository.findById.mockResolvedValue(buildTicket({ status: "ABERTO" }));
      messageRepository.create.mockResolvedValue({
        id: "msg-2",
        ticketId: "ticket-1",
        companyId: "company-1",
        autorUserId: "admin-1",
        autorIsAdminRotta: true,
        mensagem: "Vamos verificar.",
        anexoUrl: null,
        createdAt: new Date(),
        autor: { id: "admin-1", nome: "Suporte Rotta" },
      });

      await service.addMessage(
        "ticket-1",
        { mensagem: "Vamos verificar." },
        adminActor,
        {},
        "company-1",
      );

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        COMMUNICATION_REQUESTED_EVENT,
        expect.objectContaining({ userId: "gestor-1", tipo: "SUPORTE_NOVA_MENSAGEM" }),
      );
      expect(emailService.sendEmail).not.toHaveBeenCalled();
    });

    it("tenant escreve de novo → notifica todo Admin Rotta + e-mail pra caixa fixa", async () => {
      process.env.SUPPORT_INBOX_EMAIL = "rottadobrasil@gmail.com";
      ticketRepository.findById.mockResolvedValue(buildTicket({ status: "ABERTO" }));
      messageRepository.create.mockResolvedValue({
        id: "msg-3",
        ticketId: "ticket-1",
        companyId: "company-1",
        autorUserId: "gestor-1",
        autorIsAdminRotta: false,
        mensagem: "Complementando...",
        anexoUrl: null,
        createdAt: new Date(),
        autor: { id: "gestor-1", nome: "Maria Gestora" },
      });

      await service.addMessage("ticket-1", { mensagem: "Complementando..." }, empresaActor, {});

      expect(usersService.listAdminRottaUserIds).toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        COMMUNICATION_REQUESTED_EVENT,
        expect.objectContaining({ userId: "admin-1", tipo: "SUPORTE_NOVA_MENSAGEM" }),
      );
      expect(emailService.sendEmail).toHaveBeenCalledWith(
        "rottadobrasil@gmail.com",
        expect.any(String),
        expect.any(String),
      );
    });
  });

  describe("closeTicket", () => {
    it("encerra o chamado e registra auditoria", async () => {
      ticketRepository.findById.mockResolvedValue(buildTicket());
      ticketRepository.updateStatus.mockResolvedValue(buildTicket({ status: "ENCERRADO" }));

      const result = await service.closeTicket("ticket-1", empresaActor, {});

      expect(ticketRepository.updateStatus).toHaveBeenCalledWith(
        "ticket-1",
        expect.objectContaining({ status: "ENCERRADO", encerradoPorUserId: "gestor-1" }),
      );
      expect(auditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({ acao: "SUPPORT_TICKET_CLOSED" }),
      );
      expect(result.status).toBe("ENCERRADO");
    });
  });
});

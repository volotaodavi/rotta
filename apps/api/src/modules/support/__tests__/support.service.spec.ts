import { ForbiddenException, NotFoundException } from "@nestjs/common";

import { SupportService } from "../support.service";

import type { SupportMessageRepository } from "../repositories/support-message.repository";
import type {
  SupportTicketRepository,
  SupportTicketWithRelations,
} from "../repositories/support-ticket.repository";
import type { AuthenticatedUser } from "@/common/decorators/current-user.decorator";
import type { AuditLogService } from "@/modules/audit/audit-log.service";

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

  beforeEach(() => {
    ticketRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      list: jest.fn(),
      updateStatus: jest.fn(),
    };
    messageRepository = { create: jest.fn(), listByTicket: jest.fn() };
    auditLogService = { record: jest.fn() } as unknown as jest.Mocked<AuditLogService>;

    service = new SupportService(ticketRepository, messageRepository, auditLogService);
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

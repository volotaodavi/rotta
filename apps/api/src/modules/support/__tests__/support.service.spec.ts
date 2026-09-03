import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";


import { SupportService } from "../support.service";

import type { SupportMessageRepository } from "../repositories/support-message.repository";
import type {
  SupportTicketRepository,
  SupportTicketWithRelations,
} from "../repositories/support-ticket.repository";
import type { AuthenticatedUser } from "@/common/decorators/current-user.decorator";
import type { AdminInboxEmailService } from "@/infra/email/admin-inbox-email.service";
import type { EmailService } from "@/infra/email/email.service";
import type { SupportAiService } from "@/infra/support-ai/support-ai.service";
import type { AuditLogService } from "@/modules/audit/audit-log.service";
import type { ContractsService } from "@/modules/marketplace/contracts.service";
import type { ContractResponseDto } from "@/modules/marketplace/dto/contract-response.dto";
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
    protocolo: "RT-20260902-ABCDEF",
    resumoIA: null,
    arquivado: false,
    arquivadoEm: null,
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

const responsavelActor: AuthenticatedUser = {
  sub: "responsavel-1",
  tenantId: null,
  role: Role.RESPONSAVEL,
  vinculoId: "vinculo-5",
};

function buildContract(overrides: Partial<ContractResponseDto> = {}): ContractResponseDto {
  return {
    id: "contract-1",
    transportRequestId: "tr-1",
    studentId: "student-1",
    responsavelId: "responsavel-1",
    companyId: "company-1",
    schoolId: "school-1",
    vehicleId: null,
    motoristaId: null,
    monitorId: null,
    valorMensalidadeCentavos: 10000,
    planoDescricao: "Plano mensal",
    regras: "Regras",
    vigenciaInicio: new Date("2026-01-01"),
    vigenciaFim: null,
    status: "ATIVO",
    origem: "NEGOCIADO",
    authentiqueDocumentId: null,
    assinadoResponsavelEm: new Date("2026-01-01"),
    assinadoEmpresaEm: new Date("2026-01-01"),
    ativadoEm: new Date("2026-01-01"),
    encerradoEm: null,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    ...overrides,
  };
}

describe("SupportService", () => {
  let service: SupportService;
  let ticketRepository: jest.Mocked<SupportTicketRepository>;
  let messageRepository: jest.Mocked<SupportMessageRepository>;
  let auditLogService: jest.Mocked<AuditLogService>;
  let usersService: jest.Mocked<UsersService>;
  let eventEmitter: jest.Mocked<EventEmitter2>;
  let messagePersonalizationService: jest.Mocked<MessagePersonalizationService>;
  let emailService: jest.Mocked<EmailService>;
  let adminInboxEmailService: jest.Mocked<AdminInboxEmailService>;
  let supportAiService: jest.Mocked<SupportAiService>;
  let contractsService: jest.Mocked<ContractsService>;
  const originalEnv = { ...process.env };

  beforeEach(() => {
    ticketRepository = {
      create: jest.fn(),
      createBypass: jest.fn(),
      findById: jest.fn(),
      list: jest.fn(),
      updateStatus: jest.fn(),
      updateStatusBypass: jest.fn(),
      updateResumoIA: jest.fn(),
      updateResumoIABypass: jest.fn(),
      setArquivado: jest.fn(),
    };
    messageRepository = { create: jest.fn(), createBypass: jest.fn(), listByTicket: jest.fn() };
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
      suporteTicketEncerrado: jest.fn().mockReturnValue({
        titulo: "Chamado de suporte encerrado",
        corpo: "corpo do encerramento",
      }),
    } as unknown as jest.Mocked<MessagePersonalizationService>;
    emailService = {
      sendEmail: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<EmailService>;
    adminInboxEmailService = {
      send: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<AdminInboxEmailService>;
    supportAiService = {
      processarChamado: jest
        .fn()
        .mockRejectedValue(new Error("SUPPORT_AI_API_KEY não configurada.")),
    } as unknown as jest.Mocked<SupportAiService>;
    contractsService = {
      list: jest
        .fn()
        .mockResolvedValue({ items: [buildContract()], total: 1, page: 1, pageSize: 50 }),
    } as unknown as jest.Mocked<ContractsService>;

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
      adminInboxEmailService,
      supportAiService,
      contractsService,
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
        "suporte",
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

  describe("createTicket — Rotta AI (Frente 5, Gemini — processa todo grau)", () => {
    it("categoria DUVIDA + IA responde → grava resumoIA e SupportMessage com autorIsIA", async () => {
      ticketRepository.create.mockResolvedValue(
        buildTicket({
          categoria: "DUVIDA",
          assunto: "Como cadastro um aluno?",
          descricao: "Não estou achando o botão de cadastrar aluno.",
        }),
      );
      supportAiService.processarChamado.mockResolvedValue({
        resumoInterno: "Usuário não acha o botão de cadastrar aluno.",
        respostaTenant: "Você pode cadastrar o aluno em Alunos > Novo.",
      });

      await service.createTicket(
        {
          assunto: "Como cadastro um aluno?",
          descricao: "Não estou achando o botão de cadastrar aluno.",
          categoria: "DUVIDA",
        },
        empresaActor,
        {},
      );

      expect(supportAiService.processarChamado).toHaveBeenCalledWith(
        "Como cadastro um aluno?",
        "Não estou achando o botão de cadastrar aluno.",
        "DUVIDA",
      );
      expect(ticketRepository.updateResumoIA).toHaveBeenCalledWith(
        "ticket-1",
        "Usuário não acha o botão de cadastrar aluno.",
      );
      expect(messageRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          ticketId: "ticket-1",
          autorIsIA: true,
          autorIsAdminRotta: false,
          mensagem: "Você pode cadastrar o aluno em Alunos > Novo.",
        }),
      );
      expect(messageRepository.create).toHaveBeenCalledWith(
        expect.not.objectContaining({ autorUserId: expect.anything() }),
      );
    });

    it("sem SUPPORT_AI_API_KEY (ou qualquer falha) → nunca deixa de criar o chamado, nem grava resumo/mensagem", async () => {
      ticketRepository.create.mockResolvedValue(buildTicket({ categoria: "DUVIDA" }));
      supportAiService.processarChamado.mockRejectedValue(
        new Error("SUPPORT_AI_API_KEY não configurada."),
      );

      const result = await service.createTicket(
        {
          assunto: "Como cadastro um aluno?",
          descricao: "Não estou achando o botão de cadastrar aluno.",
          categoria: "DUVIDA",
        },
        empresaActor,
        {},
      );

      expect(result.status).toBe("ABERTO");
      expect(messageRepository.create).not.toHaveBeenCalled();
      expect(ticketRepository.updateResumoIA).not.toHaveBeenCalled();
    });

    it("categoria PROBLEMA_TECNICO (Grau 1) também aciona a IA", async () => {
      ticketRepository.create.mockResolvedValue(
        buildTicket({
          categoria: "PROBLEMA_TECNICO",
          assunto: "Erro ao salvar",
          descricao: "A tela trava ao salvar o cadastro.",
        }),
      );
      supportAiService.processarChamado.mockResolvedValue({
        resumoInterno: "Tela trava ao salvar cadastro.",
        respostaTenant: "Tente atualizar a página e salvar novamente.",
      });

      await service.createTicket(
        {
          assunto: "Erro ao salvar",
          descricao: "A tela trava ao salvar o cadastro.",
          categoria: "PROBLEMA_TECNICO",
        },
        empresaActor,
        {},
      );

      expect(supportAiService.processarChamado).toHaveBeenCalledWith(
        "Erro ao salvar",
        "A tela trava ao salvar o cadastro.",
        "PROBLEMA_TECNICO",
      );
      expect(messageRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          autorIsIA: true,
          mensagem: "Tente atualizar a página e salvar novamente.",
        }),
      );
    });

    it("categoria COBRANCA (Grau 3) também aciona a IA — resumo + aviso de humano, nunca resposta financeira", async () => {
      ticketRepository.create.mockResolvedValue(
        buildTicket({
          categoria: "COBRANCA",
          assunto: "Dúvida na fatura",
          descricao: "Não entendi um valor cobrado este mês.",
        }),
      );
      supportAiService.processarChamado.mockResolvedValue({
        resumoInterno: "Usuário questiona valor cobrado este mês.",
        respostaTenant: "Entendi, é sobre cobrança — um atendente da Rotta vai continuar com você.",
      });

      await service.createTicket(
        {
          assunto: "Dúvida na fatura",
          descricao: "Não entendi um valor cobrado este mês.",
          categoria: "COBRANCA",
        },
        empresaActor,
        {},
      );

      expect(supportAiService.processarChamado).toHaveBeenCalledWith(
        "Dúvida na fatura",
        "Não entendi um valor cobrado este mês.",
        "COBRANCA",
      );
      expect(ticketRepository.updateResumoIA).toHaveBeenCalledWith(
        "ticket-1",
        "Usuário questiona valor cobrado este mês.",
      );
      expect(messageRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          autorIsIA: true,
          mensagem: "Entendi, é sobre cobrança — um atendente da Rotta vai continuar com você.",
        }),
      );
    });

    it("gera um número de protocolo em todo chamado novo", async () => {
      ticketRepository.create.mockResolvedValue(buildTicket());

      await service.createTicket(
        { assunto: "Assunto", descricao: "Descrição com detalhe suficiente.", categoria: "DUVIDA" },
        empresaActor,
        {},
      );

      expect(ticketRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ protocolo: expect.stringMatching(/^RT-\d{8}-[0-9A-F]{6}$/) }),
      );
    });
  });

  describe("createTicket — Responsável (Epic B)", () => {
    it("abre o chamado sob a transportadora do contrato ATIVO do Responsável, via bypass", async () => {
      ticketRepository.createBypass.mockResolvedValue(
        buildTicket({ abertoPorUserId: "responsavel-1", categoria: "DUVIDA" }),
      );

      const result = await service.createTicket(
        {
          assunto: "Como funciona o transporte?",
          descricao: "Detalhe suficiente aqui.",
          categoria: "DUVIDA",
        },
        responsavelActor,
        {},
      );

      expect(contractsService.list).toHaveBeenCalledWith(
        { page: 1, pageSize: 50 },
        responsavelActor,
      );
      expect(ticketRepository.createBypass).toHaveBeenCalledWith(
        expect.objectContaining({ companyId: "company-1", abertoPorUserId: "responsavel-1" }),
      );
      expect(ticketRepository.create).not.toHaveBeenCalled();
      expect(result.status).toBe("ABERTO");
    });

    it("rejeita quando o Responsável não tem nenhum contrato ATIVO", async () => {
      contractsService.list.mockResolvedValue({
        items: [buildContract({ status: "AGUARDANDO_ASSINATURA" })],
        total: 1,
        page: 1,
        pageSize: 50,
      });

      await expect(
        service.createTicket(
          {
            assunto: "Como funciona o transporte?",
            descricao: "Detalhe suficiente aqui.",
            categoria: "DUVIDA",
          },
          responsavelActor,
          {},
        ),
      ).rejects.toThrow(BadRequestException);
      expect(ticketRepository.createBypass).not.toHaveBeenCalled();
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

    it("Responsável só lista os próprios chamados (abertoPorUserId, nunca o tenant inteiro)", async () => {
      ticketRepository.list.mockResolvedValue({ items: [], total: 0 });

      await service.listTickets({ page: 1, pageSize: 20 }, responsavelActor);

      expect(ticketRepository.list).toHaveBeenCalledWith(
        expect.objectContaining({ companyId: undefined, abertoPorUserId: "responsavel-1" }),
      );
    });

    it("esconde arquivados por padrão", async () => {
      ticketRepository.list.mockResolvedValue({ items: [], total: 0 });

      await service.listTickets({ page: 1, pageSize: 20 }, empresaActor);

      expect(ticketRepository.list).toHaveBeenCalledWith(
        expect.objectContaining({ arquivado: false }),
      );
    });

    it("mostra só os arquivados quando pedido explicitamente", async () => {
      ticketRepository.list.mockResolvedValue({ items: [], total: 0 });

      await service.listTickets({ page: 1, pageSize: 20, arquivado: true }, empresaActor);

      expect(ticketRepository.list).toHaveBeenCalledWith(
        expect.objectContaining({ arquivado: true }),
      );
    });

    it("achado em auditoria de segurança: resumoIA some da listagem pra Empresa/Gestor/Responsável", async () => {
      ticketRepository.list.mockResolvedValue({
        items: [buildTicket({ resumoIA: "Detalhe interno." })],
        total: 1,
      });

      const paraEmpresa = await service.listTickets({ page: 1, pageSize: 20 }, empresaActor);
      expect(paraEmpresa.items[0]!.resumoIA).toBeUndefined();

      const paraAdmin = await service.listTickets({ page: 1, pageSize: 20 }, adminActor);
      expect(paraAdmin.items[0]!.resumoIA).toBe("Detalhe interno.");
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
      expect(ticketRepository.findById).toHaveBeenCalledWith("ticket-1", "company-2", undefined);
    });

    it("achado em auditoria de segurança: resumoIA NUNCA vai pra Empresa/Gestor/Responsável, só Admin Rotta", async () => {
      ticketRepository.findById.mockResolvedValue(
        buildTicket({ resumoIA: "Detalhe interno sigiloso do caso." }),
      );
      messageRepository.listByTicket.mockResolvedValue([]);

      const paraEmpresa = await service.getTicketDetail("ticket-1", empresaActor);
      expect(paraEmpresa.resumoIA).toBeUndefined();

      const paraAdmin = await service.getTicketDetail("ticket-1", adminActor);
      expect(paraAdmin.resumoIA).toBe("Detalhe interno sigiloso do caso.");
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
        autorIsIA: false,
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
        autorIsIA: false,
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
        autorIsIA: false,
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
        autorIsIA: false,
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
        autorIsIA: false,
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
        "suporte",
      );
    });

    it("Responsável responde no próprio chamado via bypass de RLS (Epic B)", async () => {
      ticketRepository.findById.mockResolvedValue(
        buildTicket({ status: "ABERTO", abertoPorUserId: "responsavel-1" }),
      );
      messageRepository.createBypass.mockResolvedValue({
        id: "msg-4",
        ticketId: "ticket-1",
        companyId: "company-1",
        autorUserId: "responsavel-1",
        autorIsAdminRotta: false,
        autorIsIA: false,
        mensagem: "Ainda não recebi resposta.",
        anexoUrl: null,
        createdAt: new Date(),
        autor: { id: "responsavel-1", nome: "João Responsável" },
      });

      await service.addMessage(
        "ticket-1",
        { mensagem: "Ainda não recebi resposta." },
        responsavelActor,
        {},
      );

      expect(ticketRepository.findById).toHaveBeenCalledWith(
        "ticket-1",
        undefined,
        "responsavel-1",
      );
      expect(messageRepository.createBypass).toHaveBeenCalledWith(
        expect.objectContaining({ ticketId: "ticket-1", autorUserId: "responsavel-1" }),
      );
      expect(messageRepository.create).not.toHaveBeenCalled();
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

    it("Responsável encerra o próprio chamado via bypass de RLS (Epic B)", async () => {
      ticketRepository.findById.mockResolvedValue(
        buildTicket({ abertoPorUserId: "responsavel-1" }),
      );
      ticketRepository.updateStatusBypass.mockResolvedValue(
        buildTicket({ abertoPorUserId: "responsavel-1", status: "ENCERRADO" }),
      );

      const result = await service.closeTicket("ticket-1", responsavelActor, {});

      expect(ticketRepository.findById).toHaveBeenCalledWith(
        "ticket-1",
        undefined,
        "responsavel-1",
      );
      expect(ticketRepository.updateStatusBypass).toHaveBeenCalledWith(
        "ticket-1",
        expect.objectContaining({ status: "ENCERRADO", encerradoPorUserId: "responsavel-1" }),
      );
      expect(ticketRepository.updateStatus).not.toHaveBeenCalled();
      expect(result.status).toBe("ENCERRADO");
    });
  });

  describe("archiveTicket / unarchiveTicket", () => {
    it("arquiva o chamado e registra auditoria", async () => {
      ticketRepository.findById.mockResolvedValue(buildTicket());
      ticketRepository.setArquivado.mockResolvedValue(
        buildTicket({ arquivado: true, arquivadoEm: new Date() }),
      );

      const result = await service.archiveTicket("ticket-1", empresaActor, {});

      expect(ticketRepository.setArquivado).toHaveBeenCalledWith(
        "ticket-1",
        expect.objectContaining({ arquivado: true }),
      );
      expect(auditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({ acao: "SUPPORT_TICKET_ARCHIVED" }),
      );
      expect(result.arquivado).toBe(true);
    });

    it("desarquiva o chamado", async () => {
      ticketRepository.findById.mockResolvedValue(buildTicket({ arquivado: true }));
      ticketRepository.setArquivado.mockResolvedValue(buildTicket({ arquivado: false }));

      const result = await service.unarchiveTicket("ticket-1", empresaActor, {});

      expect(ticketRepository.setArquivado).toHaveBeenCalledWith(
        "ticket-1",
        expect.objectContaining({ arquivado: false, arquivadoEm: null }),
      );
      expect(result.arquivado).toBe(false);
    });

    it("Responsável nunca pode arquivar (não administra a fila de chamados)", async () => {
      await expect(service.archiveTicket("ticket-1", responsavelActor, {})).rejects.toThrow(
        ForbiddenException,
      );
      expect(ticketRepository.setArquivado).not.toHaveBeenCalled();
    });

    it("404 quando o chamado não existe no escopo do ator", async () => {
      ticketRepository.findById.mockResolvedValue(null);

      await expect(service.archiveTicket("ticket-1", empresaActor, {})).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});

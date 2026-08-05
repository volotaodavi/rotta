import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { EventoAgendaTipo } from "@prisma/client";

import { AgendaService } from "../agenda.service";

import type { AgendaEventRepository } from "../repositories/agenda-event.repository";
import type { AuthenticatedUser } from "@/common/decorators/current-user.decorator";
import type { AuditLogService } from "@/modules/audit/audit-log.service";
import type { EventoAgenda } from "@prisma/client";

import { Role } from "@/shared/enums";

function buildEvento(overrides: Partial<EventoAgenda> = {}): EventoAgenda {
  return {
    id: "evento-1",
    companyId: "company-1",
    tipo: EventoAgendaTipo.FERIADO,
    data: new Date("2026-12-25"),
    dataFim: null,
    titulo: "Natal",
    descricao: null,
    entidadeTipo: null,
    entidadeId: null,
    geradoAutomaticamente: false,
    criadoPorId: "user-gestor-1",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

const gestorActor: AuthenticatedUser = {
  sub: "user-gestor-1",
  tenantId: "company-1",
  role: Role.GESTOR,
  vinculoId: "vinculo-1",
};

const motoristaActor: AuthenticatedUser = {
  sub: "motorista-1",
  tenantId: "company-1",
  role: Role.MOTORISTA,
  vinculoId: "vinculo-2",
};

/** "Hoje" fixo e distante no futuro — evita testes ficarem quebradiços/retroativos com o passar do tempo real. */
const HOJE = new Date("2026-08-05T12:00:00Z");

describe("AgendaService", () => {
  let service: AgendaService;
  let agendaEventRepository: jest.Mocked<AgendaEventRepository>;
  let auditLogService: jest.Mocked<AuditLogService>;

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(HOJE);

    agendaEventRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      list: jest.fn(),
    };
    auditLogService = { record: jest.fn() } as unknown as jest.Mocked<AuditLogService>;

    service = new AgendaService(agendaEventRepository, auditLogService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe("create", () => {
    it("rejeita tipos gerados automaticamente (VENCIMENTO_*/TROCA_DE_ROTA_PONTUAL)", async () => {
      await expect(
        service.create(
          {
            tipo: EventoAgendaTipo.VENCIMENTO_CNH,
            data: "2026-09-01",
            titulo: "CNH vencendo",
          },
          gestorActor,
          {},
        ),
      ).rejects.toThrow(BadRequestException);
      expect(agendaEventRepository.create).not.toHaveBeenCalled();
    });

    it("rejeita Motorista/Monitor tentando criar um tipo que não seja AUSENCIA_PLANEJADA", async () => {
      await expect(
        service.create(
          { tipo: EventoAgendaTipo.FERIADO, data: "2026-09-01", titulo: "Feriado" },
          motoristaActor,
          {},
        ),
      ).rejects.toThrow(ForbiddenException);
      expect(agendaEventRepository.create).not.toHaveBeenCalled();
    });

    it("força entidadeId/entidadeTipo para o próprio ator quando Motorista cria a própria ausência", async () => {
      agendaEventRepository.create.mockResolvedValue(
        buildEvento({ tipo: EventoAgendaTipo.AUSENCIA_PLANEJADA }),
      );

      await service.create(
        {
          tipo: EventoAgendaTipo.AUSENCIA_PLANEJADA,
          data: "2026-09-01",
          titulo: "Férias",
          entidadeId: "outro-usuario-tentando-se-passar-por-alguem",
        },
        motoristaActor,
        {},
      );

      expect(agendaEventRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ entidadeTipo: "User", entidadeId: "motorista-1" }),
      );
    });

    it("rejeita ausência planejada com data retroativa", async () => {
      await expect(
        service.create(
          {
            tipo: EventoAgendaTipo.AUSENCIA_PLANEJADA,
            data: "2026-08-01",
            titulo: "Férias",
          },
          motoristaActor,
          {},
        ),
      ).rejects.toThrow(BadRequestException);
      expect(agendaEventRepository.create).not.toHaveBeenCalled();
    });

    it("rejeita feriado com mais de 7 dias retroativos", async () => {
      await expect(
        service.create(
          { tipo: EventoAgendaTipo.FERIADO, data: "2026-07-01", titulo: "Feriado antigo" },
          gestorActor,
          {},
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it("permite feriado dentro da janela retroativa curta (até 7 dias)", async () => {
      agendaEventRepository.create.mockResolvedValue(buildEvento());

      await service.create(
        { tipo: EventoAgendaTipo.FERIADO, data: "2026-08-01", titulo: "Feriado recente" },
        gestorActor,
        {},
      );

      expect(agendaEventRepository.create).toHaveBeenCalled();
    });

    it("rejeita dataFim anterior a data", async () => {
      await expect(
        service.create(
          {
            tipo: EventoAgendaTipo.RECESSO,
            data: "2026-09-10",
            dataFim: "2026-09-05",
            titulo: "Recesso",
          },
          gestorActor,
          {},
        ),
      ).rejects.toThrow(BadRequestException);
      expect(agendaEventRepository.create).not.toHaveBeenCalled();
    });

    it("cria um FERIADO com sucesso (Gestor) e registra auditoria", async () => {
      agendaEventRepository.create.mockResolvedValue(buildEvento());

      const result = await service.create(
        { tipo: EventoAgendaTipo.FERIADO, data: "2026-12-25", titulo: "Natal" },
        gestorActor,
        {},
      );

      expect(agendaEventRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          companyId: "company-1",
          tipo: EventoAgendaTipo.FERIADO,
          titulo: "Natal",
          geradoAutomaticamente: false,
          criadoPorId: "user-gestor-1",
        }),
      );
      expect(auditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({ acao: "CREATED", entidadeTipo: "EventoAgenda" }),
      );
      expect(result.id).toBe("evento-1");
    });
  });

  describe("findByIdOrThrow", () => {
    it("lança 404 quando o evento não existe", async () => {
      agendaEventRepository.findById.mockResolvedValue(null);

      await expect(service.findByIdOrThrow("evento-x", gestorActor)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("lança 404 quando o evento é de outro tenant", async () => {
      agendaEventRepository.findById.mockResolvedValue(buildEvento({ companyId: "company-outra" }));

      await expect(service.findByIdOrThrow("evento-1", gestorActor)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("update", () => {
    it("rejeita editar um evento geradoAutomaticamente", async () => {
      agendaEventRepository.findById.mockResolvedValue(
        buildEvento({ geradoAutomaticamente: true }),
      );

      await expect(
        service.update("evento-1", { titulo: "Novo título" }, gestorActor, {}),
      ).rejects.toThrow(BadRequestException);
      expect(agendaEventRepository.update).not.toHaveBeenCalled();
    });

    it("edita um evento manual com sucesso", async () => {
      agendaEventRepository.findById.mockResolvedValue(buildEvento());
      agendaEventRepository.update.mockResolvedValue(buildEvento({ titulo: "Natal (ajustado)" }));

      const result = await service.update(
        "evento-1",
        { titulo: "Natal (ajustado)" },
        gestorActor,
        {},
      );

      expect(agendaEventRepository.update).toHaveBeenCalledWith(
        "evento-1",
        expect.objectContaining({ titulo: "Natal (ajustado)" }),
      );
      expect(result.titulo).toBe("Natal (ajustado)");
    });
  });

  describe("remove", () => {
    it("rejeita remover um evento geradoAutomaticamente", async () => {
      agendaEventRepository.findById.mockResolvedValue(
        buildEvento({ geradoAutomaticamente: true }),
      );

      await expect(service.remove("evento-1", gestorActor, {})).rejects.toThrow(
        BadRequestException,
      );
      expect(agendaEventRepository.delete).not.toHaveBeenCalled();
    });

    it("remove um evento manual com sucesso", async () => {
      agendaEventRepository.findById.mockResolvedValue(buildEvento());

      await service.remove("evento-1", gestorActor, {});

      expect(agendaEventRepository.delete).toHaveBeenCalledWith("evento-1");
      expect(auditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({ acao: "DELETED" }),
      );
    });
  });

  describe("list", () => {
    it("filtra sempre pelo companyId do ator", async () => {
      agendaEventRepository.list.mockResolvedValue({ items: [buildEvento()], total: 1 });

      const result = await service.list({ page: 1, pageSize: 50 }, gestorActor);

      expect(agendaEventRepository.list).toHaveBeenCalledWith(
        expect.objectContaining({ companyId: "company-1", page: 1, pageSize: 50 }),
      );
      expect(result.total).toBe(1);
      expect(result.items).toHaveLength(1);
    });
  });
});

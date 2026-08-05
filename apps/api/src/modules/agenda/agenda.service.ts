import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { EventoAgendaTipo } from "@prisma/client";

import { AGENDA_EVENT_REPOSITORY } from "./agenda.constants";
import {
  toAgendaEventResponseDto,
  toListAgendaEventsResponseDto,
} from "./mappers/agenda-event.mapper";

import type {
  AgendaEventResponseDto,
  ListAgendaEventsResponseDto,
} from "./dto/agenda-event-response.dto";
import type { CreateAgendaEventDto } from "./dto/create-agenda-event.dto";
import type { ListAgendaEventsQueryDto } from "./dto/list-agenda-events-query.dto";
import type { UpdateAgendaEventDto } from "./dto/update-agenda-event.dto";
import type { AgendaEventRepository } from "./repositories/agenda-event.repository";
import type { AuthenticatedUser } from "@/common/decorators/current-user.decorator";

import { AuditLogService } from "@/modules/audit/audit-log.service";
import { Role } from "@/shared/enums";

export interface RequestMeta {
  ip?: string;
  userAgent?: string;
}

/** Tipos que só podem ser criados internamente (geradoAutomaticamente), nunca via API — ver nota da entidade no schema. */
const TIPOS_SOMENTE_AUTOMATICOS: readonly EventoAgendaTipo[] = [
  EventoAgendaTipo.TROCA_DE_ROTA_PONTUAL,
  EventoAgendaTipo.VENCIMENTO_CNH,
  EventoAgendaTipo.VENCIMENTO_SEGURO,
  EventoAgendaTipo.VENCIMENTO_DOCUMENTO_GENERICO,
];

/** `Trip.data`-like: início do dia corrente em UTC, para comparar com `data`/`dataFim` (`@db.Date`). */
function today(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/**
 * Núcleo de negócio do módulo Agenda (Dossiê 8 §14, EF Parte 6 AGE-01 a
 * AGE-05, tarefa #101) — calendário único para feriados, recessos,
 * eventos escolares e ausências planejadas de motorista/monitor.
 *
 * ESCOPO DESTA ENTREGA: CRUD manual de `FERIADO`/`RECESSO`/
 * `EVENTO_ESCOLAR`/`AUSENCIA_PLANEJADA`/`MANUTENCAO_VEICULO`. FORA DE
 * ESCOPO (documentado, não omitido — ver `docs/27-rotta-agenda-
 * calendario.md`): geração automática de `VENCIMENTO_CNH`/
 * `VENCIMENTO_SEGURO`/`VENCIMENTO_DOCUMENTO_GENERICO` a partir da
 * validade cadastrada em Motorista/Veículo/Documento (exigiria um job
 * assíncrono varrendo validades) e a projeção automática de
 * `TROCA_DE_ROTA_PONTUAL` a partir de `RoutesService.update`/
 * `TripsService.substituirMotorista`/`substituirVeiculo` (`AGE-04`/
 * `AGE-05`, tarefa #102 — já implementada, mas sem esta integração
 * cross-módulo ainda). Esses 4 tipos são rejeitados em `create` — nunca
 * fabricados como se já existissem.
 */
@Injectable()
export class AgendaService {
  private readonly logger = new Logger(AgendaService.name);

  constructor(
    @Inject(AGENDA_EVENT_REPOSITORY) private readonly agendaEventRepository: AgendaEventRepository,
    private readonly auditLogService: AuditLogService,
  ) {}

  private async recordAudit(input: {
    companyId: string;
    entidadeId: string;
    acao: string;
    atorUserId: string;
    dadosAntes?: Record<string, unknown>;
    dadosDepois?: Record<string, unknown>;
    ip?: string;
    userAgent?: string;
  }): Promise<void> {
    try {
      await this.auditLogService.record({ ...input, entidadeTipo: "EventoAgenda" });
    } catch (error) {
      this.logger.warn(
        `Falha ao registrar auditoria (EventoAgenda ${input.entidadeId}, ação ${input.acao})`,
      );
      this.logger.warn(error instanceof Error ? error.message : String(error));
    }
  }

  private isManager(actor: AuthenticatedUser): boolean {
    return (
      actor.role === Role.ADMIN_ROTTA || actor.role === Role.EMPRESA || actor.role === Role.GESTOR
    );
  }

  /**
   * Motorista/Monitor só podem criar a PRÓPRIA ausência planejada
   * (`AGE-03` — "Motorista solicita um período de ausência através do
   * app"); Empresa/Gestor podem criar qualquer tipo permitido para
   * qualquer entidade relacionada. Nunca aceita `entidadeId` de
   * terceiros vindo de um Motorista/Monitor — sempre força o próprio
   * `actor.sub`, mesmo princípio de não-confiar em UUID do cliente
   * usado no resto do backend.
   */
  async create(
    dto: CreateAgendaEventDto,
    actor: AuthenticatedUser,
    meta: RequestMeta,
  ): Promise<AgendaEventResponseDto> {
    if (TIPOS_SOMENTE_AUTOMATICOS.includes(dto.tipo)) {
      throw new BadRequestException(
        `O tipo ${dto.tipo} é gerado automaticamente pelo sistema e não pode ser criado manualmente.`,
      );
    }

    const isSelfService = !this.isManager(actor);
    if (isSelfService && dto.tipo !== EventoAgendaTipo.AUSENCIA_PLANEJADA) {
      throw new ForbiddenException(
        "Você só pode registrar a própria ausência planejada na agenda.",
      );
    }

    const data = new Date(dto.data);
    const dataFim = dto.dataFim ? new Date(dto.dataFim) : undefined;
    if (dataFim && dataFim < data) {
      throw new BadRequestException("dataFim não pode ser anterior a data.");
    }
    this.assertDataValida(dto.tipo, data);

    // `actor.tenantId` nunca é nulo aqui — `@Roles(...)` no controller já exclui `ADMIN_ROTTA` (que precisaria de companyId explícito, não suportado ainda nesta tarefa).
    const companyId = actor.tenantId!;
    const evento = await this.agendaEventRepository.create({
      companyId,
      tipo: dto.tipo,
      data,
      dataFim,
      titulo: dto.titulo,
      descricao: dto.descricao,
      entidadeTipo: isSelfService ? "User" : dto.entidadeTipo,
      entidadeId: isSelfService ? actor.sub : dto.entidadeId,
      geradoAutomaticamente: false,
      criadoPorId: actor.sub,
    });

    await this.recordAudit({
      companyId,
      entidadeId: evento.id,
      acao: "CREATED",
      atorUserId: actor.sub,
      dadosDepois: { tipo: evento.tipo, data: evento.data, titulo: evento.titulo },
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return toAgendaEventResponseDto(evento);
  }

  /**
   * Validações de data por tipo (AGE-01/03): feriado/recesso/evento
   * escolar não pode ser retroativo além de uma janela curta (evita
   * mascarar uma ausência de operação real não reportada); ausência
   * planejada de motorista/monitor nunca pode ser retroativa.
   */
  private assertDataValida(tipo: EventoAgendaTipo, data: Date): void {
    const hoje = today();
    if (tipo === EventoAgendaTipo.AUSENCIA_PLANEJADA && data < hoje) {
      throw new BadRequestException("Ausência planejada não pode ter data retroativa.");
    }
    const JANELA_RETROATIVA_DIAS = 7;
    const limite = new Date(hoje);
    limite.setUTCDate(limite.getUTCDate() - JANELA_RETROATIVA_DIAS);
    if (data < limite) {
      throw new BadRequestException(
        `Não é possível cadastrar um evento com mais de ${JANELA_RETROATIVA_DIAS} dias no passado.`,
      );
    }
  }

  private async fetchOrThrow(id: string, actor: AuthenticatedUser) {
    const evento = await this.agendaEventRepository.findById(id);
    if (!evento || (actor.role !== Role.ADMIN_ROTTA && evento.companyId !== actor.tenantId)) {
      throw new NotFoundException("Evento de agenda não encontrado.");
    }
    return evento;
  }

  async findByIdOrThrow(id: string, actor: AuthenticatedUser): Promise<AgendaEventResponseDto> {
    const evento = await this.fetchOrThrow(id, actor);
    return toAgendaEventResponseDto(evento);
  }

  async list(
    query: ListAgendaEventsQueryDto,
    actor: AuthenticatedUser,
  ): Promise<ListAgendaEventsResponseDto> {
    const companyId = actor.tenantId!;
    const result = await this.agendaEventRepository.list({
      companyId,
      tipo: query.tipo,
      de: query.de ? new Date(query.de) : undefined,
      ate: query.ate ? new Date(query.ate) : undefined,
      page: query.page,
      pageSize: query.pageSize,
    });
    return toListAgendaEventsResponseDto(result, query.page, query.pageSize);
  }

  async update(
    id: string,
    dto: UpdateAgendaEventDto,
    actor: AuthenticatedUser,
    meta: RequestMeta,
  ): Promise<AgendaEventResponseDto> {
    const existing = await this.fetchOrThrow(id, actor);
    if (existing.geradoAutomaticamente) {
      throw new BadRequestException(
        "Este evento foi gerado automaticamente pelo sistema e não pode ser editado manualmente.",
      );
    }

    const data = dto.data ? new Date(dto.data) : undefined;
    const dataFim = dto.dataFim ? new Date(dto.dataFim) : undefined;
    const dataFinal = dataFim ?? existing.dataFim ?? undefined;
    const dataInicial = data ?? existing.data;
    if (dataFinal && dataFinal < dataInicial) {
      throw new BadRequestException("dataFim não pode ser anterior a data.");
    }

    const updated = await this.agendaEventRepository.update(id, {
      data,
      dataFim,
      titulo: dto.titulo,
      descricao: dto.descricao,
    });

    await this.recordAudit({
      companyId: existing.companyId,
      entidadeId: id,
      acao: "UPDATED",
      atorUserId: actor.sub,
      dadosAntes: { data: existing.data, dataFim: existing.dataFim, titulo: existing.titulo },
      dadosDepois: { data: updated.data, dataFim: updated.dataFim, titulo: updated.titulo },
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return toAgendaEventResponseDto(updated);
  }

  async remove(id: string, actor: AuthenticatedUser, meta: RequestMeta): Promise<void> {
    const existing = await this.fetchOrThrow(id, actor);
    if (existing.geradoAutomaticamente) {
      throw new BadRequestException(
        "Este evento foi gerado automaticamente pelo sistema e não pode ser removido manualmente.",
      );
    }

    await this.agendaEventRepository.delete(id);

    await this.recordAudit({
      companyId: existing.companyId,
      entidadeId: id,
      acao: "DELETED",
      atorUserId: actor.sub,
      dadosAntes: { tipo: existing.tipo, data: existing.data, titulo: existing.titulo },
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
  }
}

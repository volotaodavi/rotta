import type { EventoAgenda, EventoAgendaTipo } from "@prisma/client";

export interface CreateAgendaEventData {
  companyId: string;
  tipo: EventoAgendaTipo;
  data: Date;
  dataFim?: Date;
  titulo: string;
  descricao?: string;
  entidadeTipo?: string;
  entidadeId?: string;
  geradoAutomaticamente?: boolean;
  criadoPorId?: string;
}

export interface UpdateAgendaEventData {
  data?: Date;
  dataFim?: Date | null;
  titulo?: string;
  descricao?: string | null;
}

export interface ListAgendaEventsFilter {
  companyId: string;
  tipo?: EventoAgendaTipo;
  /** Filtra eventos cujo intervalo [`data`, `dataFim` ?? `data`] cruza [`de`, `ate`]. */
  de?: Date;
  ate?: Date;
  page: number;
  pageSize: number;
}

export interface ListAgendaEventsResult {
  items: EventoAgenda[];
  total: number;
}

/**
 * `eventos_agenda` tem RLS por `companyId` (mesmo mecanismo de
 * `routes`/`trips`). Sem soft delete — mesmo raciocínio de
 * `RouteStop`/`RouteStudent` (um evento de agenda não tem histórico
 * próprio a preservar; a auditoria de criação/edição/remoção já fica em
 * `AuditLog`, via `AgendaService`).
 */
export interface AgendaEventRepository {
  create(data: CreateAgendaEventData): Promise<EventoAgenda>;
  findById(id: string): Promise<EventoAgenda | null>;
  update(id: string, data: UpdateAgendaEventData): Promise<EventoAgenda>;
  delete(id: string): Promise<void>;
  list(filter: ListAgendaEventsFilter): Promise<ListAgendaEventsResult>;
}

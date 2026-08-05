import type {
  AgendaEventResponseDto,
  ListAgendaEventsResponseDto,
} from "../dto/agenda-event-response.dto";
import type { EventoAgenda } from "@prisma/client";

export function toAgendaEventResponseDto(evento: EventoAgenda): AgendaEventResponseDto {
  return {
    id: evento.id,
    companyId: evento.companyId,
    tipo: evento.tipo,
    data: evento.data,
    dataFim: evento.dataFim,
    titulo: evento.titulo,
    descricao: evento.descricao,
    entidadeTipo: evento.entidadeTipo,
    entidadeId: evento.entidadeId,
    geradoAutomaticamente: evento.geradoAutomaticamente,
    criadoPorId: evento.criadoPorId,
    createdAt: evento.createdAt,
    updatedAt: evento.updatedAt,
  };
}

export function toListAgendaEventsResponseDto(
  result: { items: EventoAgenda[]; total: number },
  page: number,
  pageSize: number,
): ListAgendaEventsResponseDto {
  return {
    items: result.items.map(toAgendaEventResponseDto),
    total: result.total,
    page,
    pageSize,
  };
}

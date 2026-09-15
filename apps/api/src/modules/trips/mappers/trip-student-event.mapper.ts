import type { TripStudentEventResponseDto } from "../dto/trip-student-event-response.dto";
import type { TripStudentEvent } from "@prisma/client";

/**
 * `routeStop` só vem quando a consulta pediu o JOIN (ver
 * `PrismaTripStudentEventRepository`) — os dois repositórios que
 * alimentam TELA pedem; consultas internas que só contam eventos, não.
 */
export type TripStudentEventComParada = TripStudentEvent & {
  routeStop?: { endereco: string; schoolId: string | null } | null;
};

export function toTripStudentEventResponseDto(
  event: TripStudentEventComParada,
): TripStudentEventResponseDto {
  return {
    id: event.id,
    tripId: event.tripId,
    studentId: event.studentId,
    routeStopId: event.routeStopId,
    // Sem JOIN (`undefined`) e parada apagada (`null`) viram a mesma
    // coisa pra quem lê: não há local a mostrar. A tela omite a linha
    // em vez de escrever "—".
    local: event.routeStop?.endereco ?? null,
    localEhEscola: event.routeStop ? event.routeStop.schoolId !== null : undefined,
    tipo: event.tipo,
    motivoAusencia: event.motivoAusencia,
    processadoPorId: event.processadoPorId,
    processadoEm: event.processadoEm,
  };
}

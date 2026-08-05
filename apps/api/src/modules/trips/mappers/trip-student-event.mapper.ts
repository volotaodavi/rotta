import type { TripStudentEventResponseDto } from "../dto/trip-student-event-response.dto";
import type { TripStudentEvent } from "@prisma/client";

export function toTripStudentEventResponseDto(
  event: TripStudentEvent,
): TripStudentEventResponseDto {
  return {
    id: event.id,
    tripId: event.tripId,
    studentId: event.studentId,
    routeStopId: event.routeStopId,
    tipo: event.tipo,
    motivoAusencia: event.motivoAusencia,
    processadoPorId: event.processadoPorId,
    processadoEm: event.processadoEm,
  };
}

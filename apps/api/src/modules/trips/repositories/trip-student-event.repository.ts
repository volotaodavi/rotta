import type { TripStudentEvent, TripStudentEventType } from "@prisma/client";

export interface CreateTripStudentEventData {
  tripId: string;
  companyId: string;
  studentId: string;
  routeStopId: string;
  tipo: TripStudentEventType;
  motivoAusencia?: string;
  processadoPorId: string;
}

/**
 * `trip_student_events` tem RLS por `companyId`. `@@unique([tripId,
 * studentId, tipo])` no schema impede registrar o MESMO evento duas
 * vezes para o mesmo aluno na mesma viagem (ex. embarcar duas vezes) —
 * imutável (DESEMB-02): nunca há `update`/`delete` nesta interface.
 */
export interface TripStudentEventRepository {
  create(data: CreateTripStudentEventData): Promise<TripStudentEvent>;
  findByTripStudentAndTipo(
    tripId: string,
    studentId: string,
    tipo: TripStudentEventType,
  ): Promise<TripStudentEvent | null>;
  listByTrip(tripId: string): Promise<TripStudentEvent[]>;
  /**
   * Histórico de um aluno específico, através de QUALQUER viagem/tenant
   * (Responsável do interior de SP pode ter o filho mais velho numa
   * transportadora e o mais novo em outra — mesmo motivo de
   * `RouteStudentRepository.listActiveByStudentAcrossTenants`). Só é
   * seguro porque quem chama (`TripsService.listStudentEventsHistory`)
   * já validou a posse do aluno via `StudentsService.findByIdOrThrow`
   * antes — nunca exposto direto sem essa checagem.
   */
  listByStudentAcrossTenants(studentId: string, since: Date): Promise<TripStudentEvent[]>;
}

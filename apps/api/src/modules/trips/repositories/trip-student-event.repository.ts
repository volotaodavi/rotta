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
}

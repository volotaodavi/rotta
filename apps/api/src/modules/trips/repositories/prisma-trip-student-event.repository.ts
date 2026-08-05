import { Injectable } from "@nestjs/common";


import type {
  CreateTripStudentEventData,
  TripStudentEventRepository,
} from "./trip-student-event.repository";
import type { TripStudentEvent, TripStudentEventType } from "@prisma/client";

import { PrismaService } from "@/infra/database/prisma.service";

@Injectable()
export class PrismaTripStudentEventRepository implements TripStudentEventRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateTripStudentEventData): Promise<TripStudentEvent> {
    return this.prisma.withTenant(this.prisma.tripStudentEvent.create({ data }));
  }

  findByTripStudentAndTipo(
    tripId: string,
    studentId: string,
    tipo: TripStudentEventType,
  ): Promise<TripStudentEvent | null> {
    return this.prisma.withTenant(
      this.prisma.tripStudentEvent.findUnique({
        where: { tripId_studentId_tipo: { tripId, studentId, tipo } },
      }),
    );
  }

  listByTrip(tripId: string): Promise<TripStudentEvent[]> {
    return this.prisma.withTenant(
      this.prisma.tripStudentEvent.findMany({
        where: { tripId },
        orderBy: { processadoEm: "asc" },
      }),
    );
  }
}

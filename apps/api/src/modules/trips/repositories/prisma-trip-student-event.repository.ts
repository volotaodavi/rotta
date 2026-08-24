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

  listByStudentAcrossTenants(studentId: string, since: Date): Promise<TripStudentEvent[]> {
    return this.prisma.withBypass(
      this.prisma.tripStudentEvent.findMany({
        where: { studentId, processadoEm: { gte: since } },
        orderBy: { processadoEm: "desc" },
      }),
    );
  }

  async listStudentIdsAusenteToday(studentIds: string[], date: Date): Promise<string[]> {
    const eventos = await this.prisma.withTenant(
      this.prisma.tripStudentEvent.findMany({
        where: {
          studentId: { in: studentIds },
          tipo: "AUSENTE",
          trip: { data: date },
        },
        select: { studentId: true },
        distinct: ["studentId"],
      }),
    );
    return eventos.map((e) => e.studentId);
  }
}

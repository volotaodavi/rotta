import { Injectable } from "@nestjs/common";


import type {
  CreateDeliveryAttemptData,
  DeliveryStatsByCompanyRow,
  NotificationDeliveryAttemptRepository,
  UpdateDeliveryAttemptData,
} from "./notification-delivery-attempt.repository";
import type { NotificationDeliveryAttempt, Prisma } from "@prisma/client";

import { PrismaService } from "@/infra/database/prisma.service";

@Injectable()
export class PrismaNotificationDeliveryAttemptRepository implements NotificationDeliveryAttemptRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateDeliveryAttemptData): Promise<NotificationDeliveryAttempt> {
    return this.prisma.notificationDeliveryAttempt.create({
      data: {
        notificationId: data.notificationId,
        canal: data.canal,
        status: data.status,
        tentativa: data.tentativa ?? 1,
      },
    });
  }

  update(id: string, data: UpdateDeliveryAttemptData): Promise<NotificationDeliveryAttempt> {
    return this.prisma.notificationDeliveryAttempt.update({ where: { id }, data });
  }

  findById(id: string): Promise<NotificationDeliveryAttempt | null> {
    return this.prisma.notificationDeliveryAttempt.findUnique({ where: { id } });
  }

  listByNotification(notificationId: string): Promise<NotificationDeliveryAttempt[]> {
    return this.prisma.notificationDeliveryAttempt.findMany({
      where: { notificationId },
      orderBy: { createdAt: "asc" },
    });
  }

  async statsByCompany(
    companyId: string,
    filter: { desde?: Date },
  ): Promise<DeliveryStatsByCompanyRow[]> {
    const where: Prisma.NotificationDeliveryAttemptWhereInput = {
      notification: {
        companyId,
        createdAt: filter.desde ? { gte: filter.desde } : undefined,
      },
    };

    const groups = await this.prisma.withTenant(
      this.prisma.notificationDeliveryAttempt.groupBy({
        by: ["canal", "status"],
        where,
        _count: { _all: true },
        _avg: { tempoRespostaMs: true },
      }),
    );

    return groups.map((g) => ({
      canal: g.canal,
      status: g.status,
      total: g._count._all,
      tempoRespostaMedioMs: g._avg.tempoRespostaMs,
    }));
  }
}

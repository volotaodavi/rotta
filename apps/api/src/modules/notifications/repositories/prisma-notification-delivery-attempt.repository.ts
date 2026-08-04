import { Injectable } from "@nestjs/common";


import type {
  CreateDeliveryAttemptData,
  NotificationDeliveryAttemptRepository,
  UpdateDeliveryAttemptData,
} from "./notification-delivery-attempt.repository";
import type { NotificationDeliveryAttempt } from "@prisma/client";

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
}

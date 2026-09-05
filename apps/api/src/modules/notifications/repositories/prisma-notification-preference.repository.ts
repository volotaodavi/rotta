import { Injectable } from "@nestjs/common";

import type {
  NotificationPreferenceRepository,
  UpsertNotificationPreferenceData,
} from "./notification-preference.repository";
import type { NotificationPreference } from "@prisma/client";

import { PrismaService } from "@/infra/database/prisma.service";

@Injectable()
export class PrismaNotificationPreferenceRepository implements NotificationPreferenceRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByUser(userId: string): Promise<NotificationPreference | null> {
    return this.prisma.notificationPreference.findUnique({ where: { userId } });
  }

  upsert(data: UpsertNotificationPreferenceData): Promise<NotificationPreference> {
    const { userId, ...rest } = data;
    return this.prisma.notificationPreference.upsert({
      where: { userId },
      create: { userId, ...rest },
      update: rest,
    });
  }
}

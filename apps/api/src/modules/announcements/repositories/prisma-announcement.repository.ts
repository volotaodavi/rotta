import { Injectable } from "@nestjs/common";

import { ANNOUNCEMENT_INCLUDE } from "./announcement.repository";

import type {
  AnnouncementRepository,
  AnnouncementWithAutor,
  CreateAnnouncementData,
  ListAnnouncementsFilter,
  ListAnnouncementsResult,
} from "./announcement.repository";

import { PrismaService } from "@/infra/database/prisma.service";

/** Implementação Prisma do `AnnouncementRepository`. `announcements` é tabela global (sem RLS por tenant), mesma justificativa de `PrismaUserRepository`. */
@Injectable()
export class PrismaAnnouncementRepository implements AnnouncementRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateAnnouncementData): Promise<AnnouncementWithAutor> {
    return this.prisma.announcement.create({ data, include: ANNOUNCEMENT_INCLUDE });
  }

  async list(filter: ListAnnouncementsFilter): Promise<ListAnnouncementsResult> {
    const [items, total] = await Promise.all([
      this.prisma.announcement.findMany({
        include: ANNOUNCEMENT_INCLUDE,
        orderBy: { createdAt: "desc" },
        skip: (filter.page - 1) * filter.pageSize,
        take: filter.pageSize,
      }),
      this.prisma.announcement.count(),
    ]);
    return { items, total };
  }
}

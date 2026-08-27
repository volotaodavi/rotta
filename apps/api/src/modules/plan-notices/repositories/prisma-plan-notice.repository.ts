import { Injectable } from "@nestjs/common";

import { PLAN_NOTICE_INCLUDE } from "./plan-notice.repository";

import type {
  CreatePlanNoticeData,
  ListPlanNoticesFilter,
  ListPlanNoticesResult,
  PlanNoticeRepository,
  PlanNoticeWithRelations,
} from "./plan-notice.repository";

import { PrismaService } from "@/infra/database/prisma.service";

/** Implementação Prisma do `PlanNoticeRepository`. */
@Injectable()
export class PrismaPlanNoticeRepository implements PlanNoticeRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreatePlanNoticeData): Promise<PlanNoticeWithRelations> {
    return this.prisma.withBypass(
      this.prisma.planNotice.create({ data, include: PLAN_NOTICE_INCLUDE }),
    );
  }

  async list(filter: ListPlanNoticesFilter): Promise<ListPlanNoticesResult> {
    const where = filter.companyId ? { companyId: filter.companyId } : {};
    const [items, total] = await Promise.all([
      this.prisma.withBypass(
        this.prisma.planNotice.findMany({
          where,
          include: PLAN_NOTICE_INCLUDE,
          orderBy: { createdAt: "desc" },
          skip: (filter.page - 1) * filter.pageSize,
          take: filter.pageSize,
        }),
      ),
      this.prisma.withBypass(this.prisma.planNotice.count({ where })),
    ]);
    return { items, total };
  }

  setAtivo(id: string, ativo: boolean): Promise<PlanNoticeWithRelations> {
    return this.prisma.withBypass(
      this.prisma.planNotice.update({
        where: { id },
        data: { ativo },
        include: PLAN_NOTICE_INCLUDE,
      }),
    );
  }

  listActiveForCompany(companyId: string): Promise<PlanNoticeWithRelations[]> {
    return this.prisma.withTenant(
      this.prisma.planNotice.findMany({
        where: { ativo: true, OR: [{ companyId: null }, { companyId }] },
        include: PLAN_NOTICE_INCLUDE,
        orderBy: { createdAt: "desc" },
      }),
    );
  }
}

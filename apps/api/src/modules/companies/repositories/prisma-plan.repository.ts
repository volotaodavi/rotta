import { Injectable } from "@nestjs/common";

import type { PlanRepository } from "./plan.repository";
import type { Plan } from "@prisma/client";

import { PrismaService } from "@/infra/database/prisma.service";

@Injectable()
export class PrismaPlanRepository implements PlanRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByCode(code: string): Promise<Plan | null> {
    return this.prisma.plan.findUnique({ where: { code } });
  }

  findById(id: string): Promise<Plan | null> {
    return this.prisma.plan.findUnique({ where: { id } });
  }

  listActive(): Promise<Plan[]> {
    return this.prisma.plan.findMany({ where: { isActive: true }, orderBy: { priceCents: "asc" } });
  }
}

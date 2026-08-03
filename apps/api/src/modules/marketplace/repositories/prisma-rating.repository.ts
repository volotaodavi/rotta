import { Injectable } from "@nestjs/common";


import type { CreateRatingData, RatingAccessScope, RatingRepository } from "./rating.repository";
import type { Rating, RatingTargetType } from "@prisma/client";

import { PrismaService } from "@/infra/database/prisma.service";

@Injectable()
export class PrismaRatingRepository implements RatingRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateRatingData): Promise<Rating> {
    return this.prisma.withBypass(this.prisma.rating.create({ data }));
  }

  findByContractResponsavelAlvo(
    contractId: string,
    responsavelId: string,
    alvoTipo: RatingTargetType,
  ): Promise<Rating | null> {
    return this.prisma.withBypass(
      this.prisma.rating.findFirst({ where: { contractId, responsavelId, alvoTipo } }),
    );
  }

  listByContract(contractId: string, scope: RatingAccessScope): Promise<Rating[]> {
    const where = { contractId, ...(scope.companyId ? { companyId: scope.companyId } : {}) };
    return scope.responsavelId
      ? this.prisma.withBypass(
          this.prisma.rating.findMany({ where: { ...where, responsavelId: scope.responsavelId } }),
        )
      : this.prisma.withTenant(this.prisma.rating.findMany({ where }));
  }
}

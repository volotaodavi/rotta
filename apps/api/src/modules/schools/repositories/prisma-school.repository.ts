import { Injectable } from "@nestjs/common";


import type {
  CreateSchoolData,
  ListSchoolsFilter,
  ListSchoolsResult,
  SchoolRepository,
  UpdateSchoolData,
} from "./school.repository";
import type { Prisma, School } from "@prisma/client";

import { PrismaService } from "@/infra/database/prisma.service";

/**
 * `schools` não tem RLS (catálogo compartilhado — ver nota de
 * arquitetura no model `School`, `schema.prisma`): todo método aqui
 * lê/escreve diretamente via `this.prisma.school`, nunca
 * `withTenant`/`withBypass` (não há contexto de tenant para "escolher"
 * — a tabela é simplesmente visível a qualquer requisição autenticada).
 */
@Injectable()
export class PrismaSchoolRepository implements SchoolRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateSchoolData, tx?: Prisma.TransactionClient): Promise<School> {
    const client = tx ?? this.prisma;
    return client.school.create({ data });
  }

  findById(id: string): Promise<School | null> {
    return this.prisma.school.findFirst({ where: { id, deletedAt: null } });
  }

  findByCodigoInep(codigoInep: string): Promise<School | null> {
    return this.prisma.school.findFirst({ where: { codigoInep } });
  }

  update(id: string, data: UpdateSchoolData): Promise<School> {
    return this.prisma.school.update({ where: { id }, data });
  }

  async list(filter: ListSchoolsFilter): Promise<ListSchoolsResult> {
    const where: Prisma.SchoolWhereInput = {
      deletedAt: filter.includeDeleted ? undefined : null,
      ...(filter.status ? { status: filter.status } : {}),
      ...(filter.cidade ? { cidade: { equals: filter.cidade, mode: "insensitive" } } : {}),
      ...(filter.estado ? { estado: { equals: filter.estado, mode: "insensitive" } } : {}),
      ...(filter.redeEnsino
        ? { redeEnsino: { equals: filter.redeEnsino, mode: "insensitive" } }
        : {}),
      ...(filter.tipo ? { tipos: { has: filter.tipo } } : {}),
      ...(filter.turno ? { turnosAtendidos: { has: filter.turno } } : {}),
      ...(filter.companyId
        ? { vinculosEmpresa: { some: { companyId: filter.companyId, desvinculadoEm: null } } }
        : {}),
      ...(filter.search
        ? {
            OR: [
              { nomeOficial: { contains: filter.search, mode: "insensitive" } },
              { nomeFantasia: { contains: filter.search, mode: "insensitive" } },
              { codigoInep: { contains: filter.search, mode: "insensitive" } },
              { codigoInterno: { contains: filter.search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    // `vinculosEmpresa` (usado acima quando `filter.companyId` é passado) é
    // uma relação com `school_company_links`, que TEM RLS por `companyId`
    // (ao contrário de `schools`). Sem `withBypass`, essa junção rodaria
    // fora de qualquer contexto de tenant/bypass e a policy escondería
    // todas as linhas (`current_setting(...) IS NULL`), zerando o filtro
    // mesmo para o próprio dono do vínculo. O `where` acima já restringe
    // explicitamente por `companyId`, então o bypass aqui não vaza dados
    // de outras empresas — só permite que a junção "enxergue" a tabela.
    const [items, total] = filter.companyId
      ? await Promise.all([
          this.prisma.withBypass(
            this.prisma.school.findMany({
              where,
              orderBy: { [filter.sortBy]: filter.sortOrder },
              skip: (filter.page - 1) * filter.pageSize,
              take: filter.pageSize,
            }),
          ),
          this.prisma.withBypass(this.prisma.school.count({ where })),
        ])
      : await Promise.all([
          this.prisma.school.findMany({
            where,
            orderBy: { [filter.sortBy]: filter.sortOrder },
            skip: (filter.page - 1) * filter.pageSize,
            take: filter.pageSize,
          }),
          this.prisma.school.count({ where }),
        ]);

    return { items, total };
  }

  listAllActive(companyId?: string): Promise<School[]> {
    const where: Prisma.SchoolWhereInput = {
      deletedAt: null,
      status: "ATIVA",
      ...(companyId ? { vinculosEmpresa: { some: { companyId, desvinculadoEm: null } } } : {}),
    };

    // Mesmo motivo do `withBypass` em `list()` acima: a junção com
    // `school_company_links` exige contexto de RLS explícito.
    return companyId
      ? this.prisma.withBypass(this.prisma.school.findMany({ where }))
      : this.prisma.school.findMany({ where });
  }

  async nextCodigoInternoSequence(): Promise<number> {
    const [result] = await this.prisma.$queryRaw<
      { nextval: bigint }[]
    >`SELECT nextval('schools_codigo_interno_seq')`;
    if (!result) {
      throw new Error("Falha ao gerar código interno da escola (sequência indisponível).");
    }
    return Number(result.nextval);
  }
}

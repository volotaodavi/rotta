import { Injectable } from "@nestjs/common";

import type {
  CreateStudentData,
  ListStudentsFilter,
  ListStudentsResult,
  StudentAccessScope,
  StudentRepository,
  UpdateStudentData,
} from "./student.repository";
import type { Prisma, Student } from "@prisma/client";

import { PrismaService } from "@/infra/database/prisma.service";

function scopeWhere(scope: StudentAccessScope): Prisma.StudentWhereInput {
  return {
    ...(scope.responsavelId ? { responsavelId: scope.responsavelId } : {}),
    ...(scope.companyId
      ? { contracts: { some: { companyId: scope.companyId, status: "ATIVO" } } }
      : {}),
    ...(scope.motoristaOuMonitorId
      ? {
          contracts: {
            some: {
              status: "ATIVO",
              OR: [
                { motoristaId: scope.motoristaOuMonitorId },
                { monitorId: scope.motoristaOuMonitorId },
              ],
            },
          },
        }
      : {}),
  };
}

/**
 * `students` não tem RLS (pertence ao Responsável — ver nota de
 * arquitetura no model `Student`, `schema.prisma`): a maioria dos
 * métodos aqui usa `this.prisma.student` diretamente. A EXCEÇÃO é
 * `list()` quando filtrado por `companyId`/`motoristaOuMonitorId`: a
 * junção contra `contracts` (que TEM RLS por `companyId`) precisa de
 * `withBypass` explícito, ou a policy esconde todas as linhas da
 * junção e o filtro silenciosamente zera os resultados — bug real já
 * encontrado e corrigido no módulo Escolas (`PrismaSchoolRepository`),
 * mesma causa raiz aqui.
 */
@Injectable()
export class PrismaStudentRepository implements StudentRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateStudentData): Promise<Student> {
    return this.prisma.student.create({ data });
  }

  findById(id: string): Promise<Student | null> {
    return this.prisma.student.findFirst({ where: { id, deletedAt: null } });
  }

  update(id: string, data: UpdateStudentData): Promise<Student> {
    return this.prisma.student.update({ where: { id }, data });
  }

  async findByIdScoped(id: string, scope: StudentAccessScope): Promise<Student | null> {
    const where: Prisma.StudentWhereInput = { id, deletedAt: null, ...scopeWhere(scope) };
    const needsBypass = Boolean(scope.companyId ?? scope.motoristaOuMonitorId);
    return needsBypass
      ? this.prisma.withBypass(this.prisma.student.findFirst({ where }))
      : this.prisma.student.findFirst({ where });
  }

  async list(filter: ListStudentsFilter): Promise<ListStudentsResult> {
    const where: Prisma.StudentWhereInput = {
      deletedAt: filter.includeDeleted ? undefined : null,
      ...scopeWhere(filter),
      ...(filter.search ? { nome: { contains: filter.search, mode: "insensitive" } } : {}),
    };

    const findMany = () =>
      this.prisma.student.findMany({
        where,
        orderBy: { nome: "asc" },
        skip: (filter.page - 1) * filter.pageSize,
        take: filter.pageSize,
      });
    const count = () => this.prisma.student.count({ where });

    const needsBypass = Boolean(filter.companyId ?? filter.motoristaOuMonitorId);
    const [items, total] = needsBypass
      ? await Promise.all([this.prisma.withBypass(findMany()), this.prisma.withBypass(count())])
      : await Promise.all([findMany(), count()]);

    return { items, total };
  }
}

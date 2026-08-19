import { Injectable } from "@nestjs/common";

import type {
  CreateSchoolCoordinateData,
  SchoolCoordinateRepository,
} from "./school-coordinate.repository";
import type { SchoolCoordinate, SchoolCoordinateStatus } from "@prisma/client";

import { PrismaService } from "@/infra/database/prisma.service";

/**
 * `school_coordinates` não tem RLS (mesma razão de `School`/
 * `SchoolAccessPoint` — é histórico de um catálogo compartilhado, não
 * um dado de tenant) — chamadas diretas ao Prisma, sem `withTenant`.
 */
@Injectable()
export class PrismaSchoolCoordinateRepository implements SchoolCoordinateRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * `atual` (achado real investigando a Fila de Revisão Manual, pedido
   * do usuário "faça as IAs trabalharem"): esta tabela é um log
   * append-only — nunca sobrescreve, sempre grava uma tentativa nova —
   * mas até aqui nenhuma linha antiga era desativada quando uma
   * sucessora chegava. `listByStatus` filtrava só por `status` e
   * devolvia PARA SEMPRE toda linha que já passou por REVISAO_MANUAL,
   * mesmo escolas já resolvidas por uma tentativa melhor depois. Corrigido
   * aqui: cada `create` desliga o `atual` de qualquer linha anterior da
   * MESMA escola, na mesma transação que cria a nova — nunca dois
   * `$executeRaw`/updates soltos que poderiam divergir sob concorrência.
   */
  async create(data: CreateSchoolCoordinateData): Promise<SchoolCoordinate> {
    const [, created] = await this.prisma.$transaction([
      this.prisma.schoolCoordinate.updateMany({
        where: { schoolId: data.schoolId, atual: true },
        data: { atual: false },
      }),
      this.prisma.schoolCoordinate.create({ data }),
    ]);
    return created;
  }

  findById(id: string): Promise<SchoolCoordinate | null> {
    return this.prisma.schoolCoordinate.findUnique({ where: { id } });
  }

  updateStatus(
    id: string,
    status: SchoolCoordinateStatus,
    input: { validadoPorIa: boolean; motivoRevisao?: string },
  ): Promise<SchoolCoordinate> {
    return this.prisma.schoolCoordinate.update({
      where: { id },
      data: { status, validadoPorIa: input.validadoPorIa, motivoRevisao: input.motivoRevisao },
    });
  }

  findLatestBySchoolId(schoolId: string): Promise<SchoolCoordinate | null> {
    return this.prisma.schoolCoordinate.findFirst({
      where: { schoolId },
      orderBy: { createdAt: "desc" },
    });
  }

  listBySchoolId(schoolId: string): Promise<SchoolCoordinate[]> {
    return this.prisma.schoolCoordinate.findMany({
      where: { schoolId },
      orderBy: { createdAt: "desc" },
    });
  }

  listByStatus(status: SchoolCoordinateStatus): Promise<SchoolCoordinate[]> {
    return this.prisma.schoolCoordinate.findMany({
      where: { status, atual: true },
      orderBy: { createdAt: "asc" },
    });
  }
}

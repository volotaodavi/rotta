import { Injectable } from "@nestjs/common";

import type {
  DefinirEscalaData,
  EscalaCompleta,
  EscalaDoDia,
  RouteAssignmentRepository,
} from "./route-assignment.repository";

import { PrismaService } from "@/infra/database/prisma.service";

/** A escala é sempre lida com rota, veículo e pessoas — ver a nota da interface. */
const INCLUDE_COMPLETO = {
  route: { select: { nome: true, turno: true } },
  veiculo: { select: { numeroFrota: true, placa: true } },
  motorista: { select: { nome: true } },
  monitor: { select: { nome: true } },
} as const;

@Injectable()
export class PrismaRouteAssignmentRepository implements RouteAssignmentRepository {
  constructor(private readonly prisma: PrismaService) {}

  definir(data: DefinirEscalaData): Promise<EscalaCompleta> {
    return this.prisma.withTenant(
      this.prisma.routeAssignment.upsert({
        where: { routeId_data: { routeId: data.routeId, data: data.data } },
        create: data,
        // O que NÃO se atualiza também é decisão: `companyId`,
        // `routeId`, `data` e `criadoPorId` são a identidade da linha e
        // quem a abriu — reescrever qualquer um deles no lugar de
        // editar seria outra escala disfarçada de edição.
        update: {
          veiculoId: data.veiculoId,
          motoristaId: data.motoristaId,
          monitorId: data.monitorId,
          observacao: data.observacao,
        },
        include: INCLUDE_COMPLETO,
      }),
    );
  }

  listByData(data: Date): Promise<EscalaCompleta[]> {
    return this.prisma.withTenant(
      this.prisma.routeAssignment.findMany({
        where: { data },
        include: INCLUDE_COMPLETO,
        orderBy: { route: { nome: "asc" } },
      }),
    );
  }

  listDaPessoaNoPeriodo(userId: string, de: Date, ate: Date): Promise<EscalaCompleta[]> {
    return this.prisma.withTenant(
      this.prisma.routeAssignment.findMany({
        where: {
          data: { gte: de, lt: ate },
          // Monitor vê a escala em que ELE é o monitor; motorista, a
          // dele.
          OR: [{ motoristaId: userId }, { monitorId: userId }],
        },
        include: INCLUDE_COMPLETO,
        orderBy: [{ data: "asc" }, { route: { nome: "asc" } }],
      }),
    );
  }

  /** Bypass deliberado, e o filtro de rota viável — ver a nota da interface. */
  async listDoDiaPorVeiculo(
    companyId: string,
    veiculoId: string,
    dia: Date,
  ): Promise<EscalaDoDia[]> {
    const escalas = await this.prisma.withBypass(
      this.prisma.routeAssignment.findMany({
        where: {
          companyId,
          data: dia,
          veiculoId,
          route: { status: "ATIVA", deletedAt: null },
        },
        select: { routeId: true, motoristaId: true, monitorId: true },
        orderBy: { createdAt: "asc" },
      }),
    );
    return escalas;
  }

  async deleteByIdAndCompany(id: string, companyId: string): Promise<void> {
    await this.prisma.withTenant(
      this.prisma.routeAssignment.deleteMany({ where: { id, companyId } }),
    );
  }
}

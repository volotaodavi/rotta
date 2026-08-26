import { Injectable } from "@nestjs/common";

import type {
  ActiveTripWithDetails,
  CreateTripData,
  TripRepository,
  UpdateTripData,
} from "./trip.repository";
import type { Trip } from "@prisma/client";

import { PrismaService } from "@/infra/database/prisma.service";

@Injectable()
export class PrismaTripRepository implements TripRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateTripData): Promise<Trip> {
    return this.prisma.withTenant(this.prisma.trip.create({ data }));
  }

  findById(id: string): Promise<Trip | null> {
    return this.prisma.withTenant(this.prisma.trip.findUnique({ where: { id } }));
  }

  /**
   * "A viagem que importa agora, pra esta rota, neste dia" — nunca mais
   * um `findUnique` por chave composta (essa unicidade foi removida do
   * banco de propósito, ver nota em `model Trip`, `schema.prisma`): uma
   * rota pode ter mais de uma `Trip` no mesmo dia (ida/volta). Prioriza
   * a viagem ATIVA (`EM_ANDAMENTO`/`PAUSADA`) se houver uma — é a única
   * que pode existir por vez, então nunca há ambiguidade; sem nenhuma
   * ativa, cai pra mais recente (mesmo já `FINALIZADA`/`CANCELADA`),
   * que é o que a tela precisa mostrar ("a viagem de hoje já foi
   * finalizada") até o motorista iniciar outra.
   */
  async findByRouteAndDate(routeId: string, data: Date): Promise<Trip | null> {
    const ativa = await this.prisma.withTenant(
      this.prisma.trip.findFirst({
        where: { routeId, data, status: { in: ["EM_ANDAMENTO", "PAUSADA"] } },
        orderBy: { createdAt: "desc" },
      }),
    );
    if (ativa) return ativa;
    return this.prisma.withTenant(
      this.prisma.trip.findFirst({
        where: { routeId, data },
        orderBy: { createdAt: "desc" },
      }),
    );
  }

  update(id: string, data: UpdateTripData): Promise<Trip> {
    return this.prisma.withTenant(this.prisma.trip.update({ where: { id }, data }));
  }

  listActiveByCompany(companyId: string): Promise<ActiveTripWithDetails[]> {
    return this.prisma.withTenant(
      this.prisma.trip.findMany({
        where: { companyId, status: "EM_ANDAMENTO" },
        include: {
          veiculo: true,
          route: { select: { id: true, nome: true, turno: true } },
          motorista: { select: { id: true, nome: true } },
          monitor: { select: { id: true, nome: true } },
        },
      }),
    );
  }

  /**
   * `withBypass` de propósito (mesmo padrão de `findActiveDetailedByRouteId`
   * logo abaixo) — sem filtro de `companyId`, único jeito de um Admin
   * Rotta enxergar a frota de TODAS as empresas num mapa só. Volume
   * naturalmente pequeno (só viagens EM_ANDAMENTO agora, nunca o
   * histórico completo), então não precisa de paginação/janela por
   * bounding box como o mapa nacional de Escolas.
   */
  listActiveNationwide(): Promise<ActiveTripWithDetails[]> {
    return this.prisma.withBypass(
      this.prisma.trip.findMany({
        where: { status: "EM_ANDAMENTO" },
        include: {
          veiculo: true,
          route: { select: { id: true, nome: true, turno: true } },
          motorista: { select: { id: true, nome: true } },
          monitor: { select: { id: true, nome: true } },
          company: {
            select: { id: true, nomeFantasia: true, cidade: true, bairro: true, cpfCnpj: true },
          },
        },
      }),
    );
  }

  findActiveDetailedByRouteId(routeId: string, data: Date): Promise<ActiveTripWithDetails | null> {
    return this.prisma.withBypass(
      this.prisma.trip.findFirst({
        where: { routeId, data, status: "EM_ANDAMENTO" },
        include: {
          veiculo: true,
          route: { select: { id: true, nome: true, turno: true } },
          motorista: { select: { id: true, nome: true } },
          monitor: { select: { id: true, nome: true } },
        },
      }),
    );
  }

  async listByRoute(
    routeId: string,
    page: number,
    pageSize: number,
  ): Promise<{ items: Trip[]; total: number }> {
    const [items, total] = await Promise.all([
      this.prisma.withTenant(
        this.prisma.trip.findMany({
          where: { routeId },
          orderBy: { data: "desc" },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
      ),
      this.prisma.withTenant(this.prisma.trip.count({ where: { routeId } })),
    ]);
    return { items, total };
  }
}

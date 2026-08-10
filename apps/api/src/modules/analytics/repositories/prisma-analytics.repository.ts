import { Injectable } from "@nestjs/common";

import type {
  AnalyticsRepository,
  CompanyBiRow,
  HeatmapPoint,
  NationalBusinessSnapshot,
  NationalPeriodMetrics,
} from "./analytics.repository";

import { PrismaService } from "@/infra/database/prisma.service";


/** Grade de ~1,1km (2 casas decimais de grau) para agrupar paradas próximas no heatmap — mesma ordem de grandeza de `roundCoord` em `map-intelligence.service.ts`, mas arredondamento mais grosso de propósito (visão nacional, não bairro a bairro). */
function roundToGrid(value: number): number {
  return Math.round(value * 100) / 100;
}

@Injectable()
export class PrismaAnalyticsRepository implements AnalyticsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getBusinessSnapshot(): Promise<NationalBusinessSnapshot> {
    const empresasAtivas = await this.prisma.withBypass(
      this.prisma.company.findMany({
        where: { status: "ATIVO", deletedAt: null },
        select: { plan: { select: { priceCents: true } } },
      }),
    );

    return {
      mrrCentavos: empresasAtivas.reduce((soma, empresa) => soma + empresa.plan.priceCents, 0),
      empresasAtivasPagantes: empresasAtivas.length,
    };
  }

  async getPeriodMetrics(from: Date, to: Date): Promise<NationalPeriodMetrics> {
    const [novasEmpresas, empresasCanceladas, viagensRealizadas] = await Promise.all([
      this.prisma.withBypass(
        this.prisma.company.count({
          where: { createdAt: { gte: from, lt: to }, deletedAt: null },
        }),
      ),
      this.prisma.withBypass(
        this.prisma.company.count({
          where: { status: "CANCELADO", updatedAt: { gte: from, lt: to } },
        }),
      ),
      this.prisma.withBypass(this.prisma.trip.count({ where: { data: { gte: from, lt: to } } })),
    ]);

    return { novasEmpresas, empresasCanceladas, viagensRealizadas };
  }

  async listCompanyBiRows(from: Date, to: Date): Promise<CompanyBiRow[]> {
    const [
      companies,
      motoristasPorEmpresa,
      veiculosPorEmpresa,
      contratosAtivosPorEmpresa,
      viagensPorEmpresa,
    ] = await Promise.all([
      this.prisma.withBypass(
        this.prisma.company.findMany({
          where: { deletedAt: null },
          select: {
            id: true,
            nomeFantasia: true,
            status: true,
            plan: { select: { name: true, priceCents: true } },
          },
          orderBy: { nomeFantasia: "asc" },
        }),
      ),
      this.prisma.withBypass(
        this.prisma.membership.groupBy({
          by: ["companyId"],
          where: { role: "motorista", status: "ATIVO" },
          _count: { _all: true },
        }),
      ),
      this.prisma.withBypass(
        this.prisma.vehicle.groupBy({
          by: ["companyId"],
          where: { deletedAt: null },
          _count: { _all: true },
        }),
      ),
      this.prisma.withBypass(
        this.prisma.contract.groupBy({
          by: ["companyId"],
          where: { status: "ATIVO" },
          _count: { _all: true },
        }),
      ),
      this.prisma.withBypass(
        this.prisma.trip.groupBy({
          by: ["companyId"],
          where: { data: { gte: from, lt: to } },
          _count: { _all: true },
        }),
      ),
    ]);

    const porEmpresa = <T extends { companyId: string; _count: { _all: number } }>(
      rows: T[],
    ): Map<string, number> => new Map(rows.map((row) => [row.companyId, row._count._all]));

    const motoristas = porEmpresa(motoristasPorEmpresa);
    const veiculos = porEmpresa(veiculosPorEmpresa);
    const contratos = porEmpresa(contratosAtivosPorEmpresa);
    const viagens = porEmpresa(viagensPorEmpresa);

    return companies.map((company) => ({
      companyId: company.id,
      nomeFantasia: company.nomeFantasia,
      status: company.status,
      planoNome: company.plan.name,
      mensalidadeCentavos: company.plan.priceCents,
      motoristasAtivos: motoristas.get(company.id) ?? 0,
      veiculosTotal: veiculos.get(company.id) ?? 0,
      contratosAtivos: contratos.get(company.id) ?? 0,
      viagensNoPeriodo: viagens.get(company.id) ?? 0,
    }));
  }

  /**
   * Densidade operacional nacional: paradas (`RouteStop`) de rotas
   * ATIVAS, agrupadas em uma grade de ~1,1km. O agrupamento acontece em
   * memória (não `GROUP BY` no Postgres) porque `RouteStop.latitude`/
   * `longitude` são `Decimal`, não uma coluna já arredondada — para o
   * volume atual (uma linha por parada cadastrada, não por evento de
   * GPS) isso é barato; se o número de paradas crescer para a ordem de
   * milhões, mover para uma `materialized view`/`GROUP BY` no banco é o
   * próximo passo natural (mesma recomendação já registrada no Dossiê 28
   * §7.4 para analytics em geral).
   */
  async getOperationalHeatmap(): Promise<HeatmapPoint[]> {
    const paradas = await this.prisma.withBypass(
      this.prisma.routeStop.findMany({
        where: { route: { status: "ATIVA", deletedAt: null } },
        select: { latitude: true, longitude: true },
      }),
    );

    const grade = new Map<string, HeatmapPoint>();
    for (const parada of paradas) {
      const latitude = roundToGrid(Number(parada.latitude));
      const longitude = roundToGrid(Number(parada.longitude));
      const chave = `${latitude}:${longitude}`;
      const existente = grade.get(chave);
      if (existente) {
        existente.peso += 1;
      } else {
        grade.set(chave, { latitude, longitude, peso: 1 });
      }
    }

    return Array.from(grade.values());
  }
}

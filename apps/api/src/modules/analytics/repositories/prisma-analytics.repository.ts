import { Injectable } from "@nestjs/common";

import type {
  AnalyticsRepository,
  CompanyBiRow,
  HeatmapPoint,
  NationalBusinessSnapshot,
  NationalPeriodMetrics,
  SemanaDeViagensNotificadas,
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

  /**
   * Viagens por semana, e quantas avisaram alguma família.
   *
   * ## O `EXISTS`, e por que ele casa por ROTA e não por viagem
   *
   * Porque o aviso que a família recebe não carrega o id da viagem.
   * `TripsService.notifyActiveStudentsOfRoute` grava
   * `dadosContexto = { routeId, studentId }` — o id da rota e o do
   * aluno, nunca o da viagem. Casar por `tripId` devolveria zero em
   * toda semana do histórico, e um gráfico de zeros é pior que gráfico
   * nenhum: parece defeito do produto quando é defeito da consulta.
   *
   * Então o casamento é **rota + janela de tempo da viagem**: um aviso
   * conta para esta viagem se foi criado entre o início dela e o fim.
   * Isso separa corretamente a ida da volta da mesma rota no mesmo dia,
   * que são duas viagens com duas janelas que não se tocam.
   *
   * ## Os dois limites da janela, e por que existem
   *
   * `COALESCE(finalizadaEm, canceladaEm, now())` cobre a viagem que
   * ainda está rodando — sem isso, toda viagem em andamento contaria
   * como "não avisada" até ser encerrada.
   *
   * O `LEAST(..., iniciadaEm + 12 horas)` cobre a viagem ABANDONADA: a
   * que o motorista iniciou e nunca encerrou, e que o varredor de sinal
   * ainda não fechou. Sem o teto, a janela dela cresceria para sempre e
   * ela acabaria "avisada" por um aviso de outra viagem da mesma rota,
   * semanas depois. Doze horas é teto, não estimativa: nenhuma viagem
   * de transporte escolar dura isso.
   *
   * ## E por que `memberships`
   *
   * Porque a métrica é sobre a FAMÍLIA. `notifications` também guarda
   * aviso de motorista (`ESCALA_ALTERADA` carrega `routeId` e cairia na
   * mesma janela) e de gestor. O `EXISTS` exige que o destinatário
   * tenha vínculo de `responsavel` na mesma empresa da viagem.
   */
  async listViagensNotificadasPorSemana(semanas: number): Promise<SemanaDeViagensNotificadas[]> {
    const inicio = segundaDaSemanaUtc(new Date());
    inicio.setUTCDate(inicio.getUTCDate() - (semanas - 1) * 7);

    /*
      `withBypass` como todo o resto deste repositório: é visão
      nacional de Admin Rotta, e `trips`/`notifications` têm RLS.

      `::int` nos dois `COUNT`: sem o cast o Postgres devolve `bigint`,
      que o Prisma entrega como `BigInt` — e `JSON.stringify` de um
      `BigInt` lança `TypeError` na serialização da resposta.
    */
    return this.prisma.withBypass(
      this.prisma.$queryRaw<SemanaDeViagensNotificadas[]>`
        WITH viagens AS (
          SELECT date_trunc('week', t.data) AS semana,
                 EXISTS (
                   SELECT 1
                     FROM notifications n
                     JOIN memberships m
                       ON m."userId" = n."userId"
                      AND m."companyId" = t."companyId"
                      AND m.role = 'responsavel'
                    WHERE n."companyId" = t."companyId"
                      AND n."dadosContexto" ->> 'routeId' = t."routeId"::text
                      AND n."createdAt" >= t."iniciadaEm"
                      AND n."createdAt" <= LEAST(
                            COALESCE(t."finalizadaEm", t."canceladaEm", now()),
                            t."iniciadaEm" + interval '12 hours'
                          )
                 ) AS avisada
            FROM trips t
           WHERE t.data >= ${inicio}
        )
        SELECT semana,
               COUNT(*)::int AS viagens,
               COUNT(*) FILTER (WHERE avisada)::int AS "comResponsavelNotificado"
          FROM viagens
         GROUP BY semana
         ORDER BY semana ASC
      `,
    );
  }
}

/**
 * A segunda-feira da semana de `data`, meia-noite UTC.
 *
 * O mesmo recorte que `date_trunc('week')` faz no Postgres (ISO-8601:
 * a semana começa na segunda), para o começo da série e o agrupamento
 * não discordarem em um dia e cortarem meia semana do gráfico.
 */
function segundaDaSemanaUtc(data: Date): Date {
  const segunda = new Date(Date.UTC(data.getUTCFullYear(), data.getUTCMonth(), data.getUTCDate()));
  // `getUTCDay()`: 0 é domingo. O domingo pertence à semana que começou
  // na segunda anterior, seis dias atrás — não à que começa amanhã.
  const diasDesdeSegunda = (segunda.getUTCDay() + 6) % 7;
  segunda.setUTCDate(segunda.getUTCDate() - diasDesdeSegunda);
  return segunda;
}

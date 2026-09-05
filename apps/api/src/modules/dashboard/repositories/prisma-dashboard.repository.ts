import { Injectable } from "@nestjs/common";
import { TripStatus } from "@prisma/client";

import type {
  CompanyDashboardData,
  DashboardRepository,
  DriverDashboardData,
  ResponsavelDashboardData,
  TripCounters,
} from "./dashboard.repository";
import type { Prisma } from "@prisma/client";

import { PrismaService } from "@/infra/database/prisma.service";

const DOCUMENT_PENDING_AI_STATUSES = ["PENDENTE", "REPROVADO"] as const;
const OPEN_TICKET_STATUSES = ["ABERTO", "EM_ANDAMENTO"] as const;
const DOCUMENTOS_VENCENDO_EM_DIAS_GESTOR = 7;
const DOCUMENTOS_VENCENDO_EM_DIAS_MOTORISTA = 30;

function startOfToday(): { gte: Date; lt: Date } {
  const gte = new Date();
  gte.setHours(0, 0, 0, 0);
  const lt = new Date(gte);
  lt.setDate(lt.getDate() + 1);
  return { gte, lt };
}

function daysFromNow(days: number): { gte: Date; lte: Date } {
  const gte = new Date();
  const lte = new Date();
  lte.setDate(lte.getDate() + days);
  return { gte, lte };
}

function tripCountersFromGroupBy(
  rows: Array<{ status: TripStatus; _count: { _all: number } }>,
): TripCounters {
  const byStatus = Object.fromEntries(rows.map((row) => [row.status, row._count._all])) as Record<
    TripStatus,
    number | undefined
  >;
  const emAndamento = byStatus.EM_ANDAMENTO ?? 0;
  const concluidas = byStatus.FINALIZADA ?? 0;
  const canceladas = byStatus.CANCELADA ?? 0;
  return { total: emAndamento + concluidas + canceladas, emAndamento, concluidas, canceladas };
}

@Injectable()
export class PrismaDashboardRepository implements DashboardRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getCompanyDashboard(companyId: string): Promise<CompanyDashboardData> {
    const hoje = startOfToday();
    const vencendoEm7Dias = daysFromNow(DOCUMENTOS_VENCENDO_EM_DIAS_GESTOR);

    const [
      rotasAtivas,
      rotasTotal,
      viagensHojePorStatus,
      motoristasAtivos,
      monitoresAtivos,
      veiculosTotal,
      alunosAtivosContratos,
      chamadosAbertos,
      documentosMotoristaVencendo,
      documentosVeiculoVencendo,
      contratosAtivos,
    ] = await Promise.all([
      this.prisma.withTenant(
        this.prisma.route.count({ where: { companyId, status: "ATIVA", deletedAt: null } }),
      ),
      this.prisma.withTenant(this.prisma.route.count({ where: { companyId, deletedAt: null } })),
      this.prisma.withTenant(
        this.prisma.trip.groupBy({
          by: ["status"],
          where: { companyId, data: { gte: hoje.gte, lt: hoje.lt } },
          _count: { _all: true },
        }),
      ),
      this.prisma.withTenant(
        this.prisma.membership.count({ where: { companyId, role: "motorista", status: "ATIVO" } }),
      ),
      this.prisma.withTenant(
        this.prisma.membership.count({ where: { companyId, role: "monitor", status: "ATIVO" } }),
      ),
      this.prisma.withTenant(this.prisma.vehicle.count({ where: { companyId, deletedAt: null } })),
      this.prisma.withTenant(
        this.prisma.contract.findMany({
          where: { companyId, status: "ATIVO" },
          distinct: ["studentId"],
          select: { studentId: true },
        }),
      ),
      this.prisma.withTenant(
        this.prisma.supportTicket.count({
          where: { companyId, status: { in: [...OPEN_TICKET_STATUSES] } },
        }),
      ),
      this.prisma.withTenant(
        this.prisma.driverDocument.count({
          where: { companyId, deletedAt: null, vencimentoEm: vencendoEm7Dias },
        }),
      ),
      this.prisma.withTenant(
        this.prisma.vehicleDocument.count({
          where: { companyId, deletedAt: null, vencimentoEm: vencendoEm7Dias },
        }),
      ),
      this.prisma.withTenant(
        this.prisma.contract.aggregate({
          where: { companyId, status: "ATIVO" },
          _count: { _all: true },
          _sum: { valorMensalidadeCentavos: true },
        }),
      ),
    ]);

    return {
      rotasAtivas,
      rotasTotal,
      viagensHoje: tripCountersFromGroupBy(viagensHojePorStatus),
      motoristasAtivos,
      monitoresAtivos,
      veiculosTotal,
      alunosAtivos: alunosAtivosContratos.length,
      chamadosAbertos,
      documentosVencendoEm7Dias: {
        motorista: documentosMotoristaVencendo,
        veiculo: documentosVeiculoVencendo,
      },
      receitaEstimadaCentavos: contratosAtivos._sum.valorMensalidadeCentavos ?? 0,
      contratosAtivos: contratosAtivos._count._all,
    };
  }

  async getDriverDashboard(userId: string): Promise<DriverDashboardData> {
    const hoje = startOfToday();
    const vencendoEm30Dias = daysFromNow(DOCUMENTOS_VENCENDO_EM_DIAS_MOTORISTA);
    const meuPapel: Prisma.TripWhereInput = {
      OR: [{ motoristaId: userId }, { monitorId: userId }],
    };

    const [viagensHojePorStatus, documentosPendentesAnaliseIa, documentosVencendoEm30Dias] =
      await Promise.all([
        this.prisma.withTenant(
          this.prisma.trip.groupBy({
            by: ["status"],
            where: { ...meuPapel, data: { gte: hoje.gte, lt: hoje.lt } },
            _count: { _all: true },
          }),
        ),
        this.prisma.withTenant(
          this.prisma.driverDocument.count({
            where: {
              userId,
              deletedAt: null,
              rottaAiStatus: { in: [...DOCUMENT_PENDING_AI_STATUSES] },
            },
          }),
        ),
        this.prisma.withTenant(
          this.prisma.driverDocument.count({
            where: { userId, deletedAt: null, vencimentoEm: vencendoEm30Dias },
          }),
        ),
      ]);

    return {
      viagensHoje: tripCountersFromGroupBy(viagensHojePorStatus),
      documentosPendentesAnaliseIa,
      documentosVencendoEm30Dias,
    };
  }

  async getResponsavelDashboard(responsavelId: string): Promise<ResponsavelDashboardData> {
    const [filhosTotal, contratosAtivos, contratosTotal] = await Promise.all([
      this.prisma.withBypass(
        this.prisma.student.count({ where: { responsavelId, deletedAt: null } }),
      ),
      this.prisma.withBypass(
        this.prisma.contract.count({ where: { responsavelId, status: "ATIVO" } }),
      ),
      this.prisma.withBypass(this.prisma.contract.count({ where: { responsavelId } })),
    ]);

    return { filhosTotal, contratosAtivos, contratosTotal };
  }
}

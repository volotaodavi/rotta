import { Injectable } from "@nestjs/common";
import { CompanyStatus } from "@prisma/client";

import type {
  ApprovalQueueData,
  BackofficeRepository,
  DashboardSummaryData,
} from "./backoffice.repository";

import { PrismaService } from "@/infra/database/prisma.service";

const PENDING_AI_STATUSES = ["PENDENTE", "REPROVADO"] as const;
const OPEN_TICKET_STATUSES = ["ABERTO", "EM_ANDAMENTO"] as const;

@Injectable()
export class PrismaBackofficeRepository implements BackofficeRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboardSummary(): Promise<DashboardSummaryData> {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const startOfTomorrow = new Date(startOfToday);
    startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);

    const [
      empresasPorStatusRaw,
      motoristasAtivos,
      monitoresAtivos,
      veiculosTotal,
      alunosTotal,
      viagensHoje,
      chamadosAbertos,
      documentosMotoristaPendentes,
      documentosVeiculoPendentes,
      contratosAguardandoAssinatura,
    ] = await Promise.all([
      this.prisma.withBypass(
        this.prisma.company.groupBy({
          by: ["status"],
          where: { deletedAt: null },
          _count: { _all: true },
        }),
      ),
      this.prisma.withBypass(
        this.prisma.membership.count({ where: { role: "motorista", status: "ATIVO" } }),
      ),
      this.prisma.withBypass(
        this.prisma.membership.count({ where: { role: "monitor", status: "ATIVO" } }),
      ),
      this.prisma.withBypass(this.prisma.vehicle.count({ where: { deletedAt: null } })),
      this.prisma.withBypass(this.prisma.student.count({ where: { deletedAt: null } })),
      this.prisma.withBypass(
        this.prisma.trip.count({ where: { data: { gte: startOfToday, lt: startOfTomorrow } } }),
      ),
      this.prisma.withBypass(
        this.prisma.supportTicket.count({ where: { status: { in: [...OPEN_TICKET_STATUSES] } } }),
      ),
      this.prisma.withBypass(
        this.prisma.driverDocument.count({
          where: { deletedAt: null, rottaAiStatus: { in: [...PENDING_AI_STATUSES] } },
        }),
      ),
      this.prisma.withBypass(
        this.prisma.vehicleDocument.count({
          where: { deletedAt: null, rottaAiStatus: { in: [...PENDING_AI_STATUSES] } },
        }),
      ),
      this.prisma.withBypass(
        this.prisma.contract.count({ where: { status: "AGUARDANDO_ASSINATURA" } }),
      ),
    ]);

    const empresasPorStatus = Object.fromEntries(
      Object.values(CompanyStatus).map((status) => [status, 0]),
    ) as Record<CompanyStatus, number>;
    let empresasTotal = 0;
    for (const row of empresasPorStatusRaw) {
      empresasPorStatus[row.status] = row._count._all;
      empresasTotal += row._count._all;
    }

    return {
      empresasPorStatus,
      empresasTotal,
      motoristasAtivos,
      monitoresAtivos,
      veiculosTotal,
      alunosTotal,
      viagensHoje,
      chamadosAbertos,
      documentosMotoristaPendentes,
      documentosVeiculoPendentes,
      contratosAguardandoAssinatura,
    };
  }

  async listPendingApprovals(limitPerCategoria: number): Promise<ApprovalQueueData> {
    const [documentosMotorista, documentosVeiculo, contratos] = await Promise.all([
      this.prisma.withBypass(
        this.prisma.driverDocument.findMany({
          where: { deletedAt: null, rottaAiStatus: { in: [...PENDING_AI_STATUSES] } },
          include: {
            company: { select: { nomeFantasia: true } },
            user: { select: { nome: true } },
          },
          orderBy: { createdAt: "desc" },
          take: limitPerCategoria,
        }),
      ),
      this.prisma.withBypass(
        this.prisma.vehicleDocument.findMany({
          where: { deletedAt: null, rottaAiStatus: { in: [...PENDING_AI_STATUSES] } },
          // `VehicleDocument` não tem relação `company` própria (só o
          // escalar `companyId`, redundante com `vehicle.companyId` —
          // ver comentário do model no schema) — o nome vem via `vehicle.company`.
          include: {
            vehicle: { select: { placa: true, company: { select: { nomeFantasia: true } } } },
          },
          orderBy: { createdAt: "desc" },
          take: limitPerCategoria,
        }),
      ),
      this.prisma.withBypass(
        this.prisma.contract.findMany({
          where: { status: "AGUARDANDO_ASSINATURA" },
          include: {
            company: { select: { nomeFantasia: true } },
            student: { select: { nome: true } },
          },
          orderBy: { createdAt: "desc" },
          take: limitPerCategoria,
        }),
      ),
    ]);

    return {
      documentosMotorista: documentosMotorista.map((doc) => ({
        id: doc.id,
        companyId: doc.companyId,
        companyNome: doc.company.nomeFantasia,
        userId: doc.userId,
        userNome: doc.user.nome,
        tipo: doc.tipo,
        rottaAiStatus: doc.rottaAiStatus,
        createdAt: doc.createdAt,
      })),
      documentosVeiculo: documentosVeiculo.map((doc) => ({
        id: doc.id,
        companyId: doc.companyId,
        companyNome: doc.vehicle.company.nomeFantasia,
        vehicleId: doc.vehicleId,
        vehiclePlaca: doc.vehicle.placa,
        tipo: doc.tipo,
        rottaAiStatus: doc.rottaAiStatus,
        createdAt: doc.createdAt,
      })),
      contratos: contratos.map((contract) => ({
        id: contract.id,
        companyId: contract.companyId,
        companyNome: contract.company.nomeFantasia,
        studentNome: contract.student.nome,
        status: contract.status,
        createdAt: contract.createdAt,
      })),
    };
  }
}

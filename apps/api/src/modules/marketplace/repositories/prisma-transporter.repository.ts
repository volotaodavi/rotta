import { Injectable } from "@nestjs/common";


import type {
  SearchTransportersFilter,
  TransporterCandidate,
  TransporterRepository,
} from "./transporter.repository";
import type { Prisma, Rating } from "@prisma/client";

import { PrismaService } from "@/infra/database/prisma.service";

const ACTIVE_VEHICLE_STATUS: Prisma.VehicleWhereInput["status"] = {
  notIn: ["INATIVO", "BLOQUEADO"],
};

const candidateInclude = {
  plan: true,
  vehicles: {
    where: { deletedAt: null, status: ACTIVE_VEHICLE_STATUS },
    include: { documentos: { where: { deletedAt: null } } },
  },
  contratos: {
    where: { status: "ATIVO" as const },
    select: { studentId: true, valorMensalidadeCentavos: true },
  },
  avaliacoesRecebidas: { select: { nota: true } },
} satisfies Prisma.CompanyInclude;

function toCandidate(
  company: Prisma.CompanyGetPayload<{ include: typeof candidateInclude }>,
): TransporterCandidate {
  return {
    company,
    veiculosAtivos: company.vehicles,
    alunosTransportadosIds: [...new Set(company.contratos.map((c) => c.studentId))],
    ratings: company.avaliacoesRecebidas,
    mensalidadesAtivasCentavos: company.contratos.map((c) => c.valorMensalidadeCentavos),
  };
}

/**
 * `PrismaTransporterRepository` — ver nota de bypass deliberado na
 * interface (`transporter.repository.ts`). Filtros geográficos
 * (`raioKm`) e o cálculo do selo Verificado NÃO entram na query: ambos
 * dependem de dados já carregados (coordenadas/documentos) e são
 * resolvidos por `MarketplaceService`, mantendo este repositório restrito
 * a "quais Empresas atendem aos critérios de negócio".
 */
@Injectable()
export class PrismaTransporterRepository implements TransporterRepository {
  constructor(private readonly prisma: PrismaService) {}

  async searchCandidates(filter: SearchTransportersFilter): Promise<TransporterCandidate[]> {
    const where: Prisma.CompanyWhereInput = {
      status: "ATIVO",
      deletedAt: null,
      latitude: { not: null },
      longitude: { not: null },
      ...(filter.tipoEmpresa ? { tipo: filter.tipoEmpresa } : {}),
      ...(filter.escolaId
        ? { escolasVinculadas: { some: { schoolId: filter.escolaId, desvinculadoEm: null } } }
        : {}),
      ...(filter.tipoVeiculo
        ? {
            vehicles: {
              some: { tipo: filter.tipoVeiculo, deletedAt: null, status: ACTIVE_VEHICLE_STATUS },
            },
          }
        : {}),
    };

    const companies = await this.prisma.withBypass(
      this.prisma.company.findMany({ where, include: candidateInclude }),
    );

    return companies.map(toCandidate);
  }

  async findCandidateById(companyId: string): Promise<TransporterCandidate | null> {
    const company = await this.prisma.withBypass(
      this.prisma.company.findFirst({
        where: { id: companyId, status: "ATIVO", deletedAt: null },
        include: candidateInclude,
      }),
    );
    return company ? toCandidate(company) : null;
  }

  listRecentRatingsForCompany(
    companyId: string,
    limit: number,
  ): Promise<(Rating & { responsavel: { nome: string } })[]> {
    return this.prisma.withBypass(
      this.prisma.rating.findMany({
        where: { companyId, alvoTipo: "EMPRESA", comentario: { not: null } },
        include: { responsavel: { select: { nome: true } } },
        orderBy: { createdAt: "desc" },
        take: limit,
      }),
    );
  }
}

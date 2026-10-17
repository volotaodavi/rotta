import { Injectable } from "@nestjs/common";

import type {
  ContractInvoiceComContexto,
  ContractInvoiceRepository,
  ContratoParaFaturar,
  CreateContractInvoiceData,
  ListContractInvoicesFilter,
  ListContractInvoicesResult,
  UpdateContractInvoiceData,
} from "./contract-invoice.repository";
import type { ContractInvoice } from "@prisma/client";

import { PrismaService } from "@/infra/database/prisma.service";

const COM_CONTEXTO = {
  student: { select: { id: true, nome: true } },
  company: { select: { id: true, nomeFantasia: true } },
} as const;

@Injectable()
export class PrismaContractInvoiceRepository implements ContractInvoiceRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateContractInvoiceData): Promise<ContractInvoice> {
    return this.prisma.withTenant(this.prisma.contractInvoice.create({ data }));
  }

  findById(id: string): Promise<ContractInvoice | null> {
    return this.prisma.withTenant(this.prisma.contractInvoice.findUnique({ where: { id } }));
  }

  update(id: string, data: UpdateContractInvoiceData): Promise<ContractInvoice> {
    return this.prisma.withTenant(this.prisma.contractInvoice.update({ where: { id }, data }));
  }

  async list(filter: ListContractInvoicesFilter): Promise<ListContractInvoicesResult> {
    const where = {
      companyId: filter.companyId,
      ...(filter.status ? { status: filter.status } : {}),
      ...(filter.competencia ? { competencia: filter.competencia } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.withTenant(
        this.prisma.contractInvoice.findMany({
          where,
          include: COM_CONTEXTO,
          orderBy: [{ competencia: "desc" }, { vencimento: "asc" }],
          skip: (filter.page - 1) * filter.pageSize,
          take: filter.pageSize,
        }),
      ),
      this.prisma.withTenant(this.prisma.contractInvoice.count({ where })),
    ]);

    return { items, total };
  }

  listByStudentAcrossTenants(studentId: string): Promise<ContractInvoiceComContexto[]> {
    return this.prisma.withBypass(
      this.prisma.contractInvoice.findMany({
        where: { studentId },
        include: COM_CONTEXTO,
        orderBy: { competencia: "desc" },
        // Doze meses cobrem o ano letivo inteiro, que é o horizonte que
        // uma família confere. Sem limite, a tela de um aluno antigo
        // baixaria anos de histórico para mostrar as três faturas de
        // cima.
        take: 12,
      }),
    );
  }

  findByIdAcrossTenants(id: string): Promise<ContractInvoiceComContexto | null> {
    return this.prisma.withBypass(
      this.prisma.contractInvoice.findUnique({ where: { id }, include: COM_CONTEXTO }),
    );
  }

  findByAsaasPaymentIdAcrossTenants(asaasPaymentId: string): Promise<ContractInvoice | null> {
    return this.prisma.withBypass(
      this.prisma.contractInvoice.findUnique({ where: { asaasPaymentId } }),
    );
  }

  listContratosSemFaturaAcrossTenants(competencia: Date): Promise<ContratoParaFaturar[]> {
    return this.prisma.withBypass(
      this.prisma.contract.findMany({
        where: {
          status: "ATIVO",
          valorMensalidadeCentavos: { gt: 0 },
          faturas: { none: { competencia } },
        },
        select: {
          id: true,
          companyId: true,
          studentId: true,
          responsavelId: true,
          valorMensalidadeCentavos: true,
        },
      }),
    );
  }

  async marcarVencidasAcrossTenants(hoje: Date): Promise<number> {
    const { count } = await this.prisma.withBypass(
      this.prisma.contractInvoice.updateMany({
        where: { status: "A_VENCER", vencimento: { lt: hoje } },
        data: { status: "VENCIDA" },
      }),
    );
    return count;
  }
}

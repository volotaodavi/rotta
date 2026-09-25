import { Injectable } from "@nestjs/common";

import type {
  ContractAccessScope,
  ContractRepository,
  CreateContractData,
  CreateTermoCienciaData,
  ListContractsFilter,
  ListContractsResult,
} from "./contract.repository";
import type { Contract, Prisma } from "@prisma/client";

import { PrismaService } from "@/infra/database/prisma.service";

function scopeWhere(scope: ContractAccessScope): Prisma.ContractWhereInput {
  return {
    ...(scope.responsavelId ? { responsavelId: scope.responsavelId } : {}),
    ...(scope.companyId ? { companyId: scope.companyId } : {}),
  };
}

@Injectable()
export class PrismaContractRepository implements ContractRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateContractData): Promise<Contract> {
    return this.prisma.withTenant(this.prisma.contract.create({ data }));
  }

  createTermoCienciaAutomatico(data: CreateTermoCienciaData): Promise<Contract> {
    const agora = new Date();
    return this.prisma.withBypass(
      this.prisma.contract.create({
        data: {
          ...data,
          origem: "TERMO_CIENCIA_AUTOMATICO",
          status: "ATIVO",
          valorMensalidadeCentavos: 0,
          planoDescricao: "Mensalidade e plano a definir pela transportadora",
          regras:
            "Termo de ciência gerado automaticamente no credenciamento via código do transporte. As regras comerciais completas (mensalidade, condições de prestação do serviço) ainda serão definidas pela transportadora.",
          vigenciaInicio: agora,
          ativadoEm: agora,
        },
      }),
    );
  }

  /**
   * A autorização de embarque do transporte PÚBLICO LICITADO
   * (25/09/2026, "não quero mistura").
   *
   * Um irmão do termo de ciência, e deliberadamente NÃO o mesmo método
   * com um parâmetro: os dois textos dizem coisas opostas ao
   * responsável. O termo de ciência promete que "a mensalidade ainda
   * será definida pela transportadora" — uma cobrança que vem depois.
   * Aqui não há cobrança nenhuma, nem agora nem depois, porque o
   * município já pagou. Um pai de Maricá lendo a frase do termo teria
   * todo motivo para achar que vai receber um boleto.
   *
   * O valor zero, que no termo de ciência é um placeholder à espera de
   * um número real, aqui é o número real.
   */
  createAutorizacaoPublica(data: CreateTermoCienciaData): Promise<Contract> {
    const agora = new Date();
    return this.prisma.withBypass(
      this.prisma.contract.create({
        data: {
          ...data,
          origem: "PUBLICO_LICITADO",
          status: "ATIVO",
          valorMensalidadeCentavos: 0,
          planoDescricao: "Transporte escolar custeado pelo município — sem mensalidade",
          regras:
            "Autorização de embarque no transporte escolar público. O serviço é custeado pelo município por contrato de licitação: não há mensalidade, taxa de adesão ou qualquer cobrança ao responsável, agora ou no futuro.",
          vigenciaInicio: agora,
          ativadoEm: agora,
        },
      }),
    );
  }

  findByTransportRequestId(transportRequestId: string): Promise<Contract | null> {
    return this.prisma.withTenant(
      this.prisma.contract.findFirst({ where: { transportRequestId } }),
    );
  }

  async findByIdScoped(id: string, scope: ContractAccessScope): Promise<Contract | null> {
    const where: Prisma.ContractWhereInput = { id, ...scopeWhere(scope) };
    return scope.responsavelId
      ? this.prisma.withBypass(this.prisma.contract.findFirst({ where }))
      : this.prisma.withTenant(this.prisma.contract.findFirst({ where }));
  }

  findById(id: string): Promise<Contract | null> {
    return this.prisma.withTenant(this.prisma.contract.findFirst({ where: { id } }));
  }

  updateAsEmpresa(id: string, data: Partial<Contract>): Promise<Contract> {
    return this.prisma.withTenant(this.prisma.contract.update({ where: { id }, data }));
  }

  updateAsResponsavel(id: string, data: Partial<Contract>): Promise<Contract> {
    return this.prisma.withBypass(this.prisma.contract.update({ where: { id }, data }));
  }

  activate(id: string): Promise<Contract> {
    return this.prisma.withBypass(
      this.prisma.contract.update({
        where: { id },
        data: { status: "ATIVO", ativadoEm: new Date() },
      }),
    );
  }

  async list(filter: ListContractsFilter): Promise<ListContractsResult> {
    const where: Prisma.ContractWhereInput = scopeWhere(filter);

    const findMany = () =>
      this.prisma.contract.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (filter.page - 1) * filter.pageSize,
        take: filter.pageSize,
      });
    const count = () => this.prisma.contract.count({ where });

    const [items, total] = filter.responsavelId
      ? await Promise.all([this.prisma.withBypass(findMany()), this.prisma.withBypass(count())])
      : await Promise.all([this.prisma.withTenant(findMany()), this.prisma.withTenant(count())]);

    return { items, total };
  }
}

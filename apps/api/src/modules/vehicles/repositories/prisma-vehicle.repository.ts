import { Injectable } from "@nestjs/common";

import type { ViagemDoChecklist } from "./vehicle-checklist.repository";
import type {
  CreateVehicleData,
  ListVehiclesFilter,
  ListVehiclesResult,
  UpdateVehicleData,
  VehicleRepository,
} from "./vehicle.repository";
import type { Prisma, Vehicle } from "@prisma/client";

import { PrismaService } from "@/infra/database/prisma.service";

@Injectable()
export class PrismaVehicleRepository implements VehicleRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateVehicleData, tx?: Prisma.TransactionClient): Promise<Vehicle> {
    if (tx) {
      return tx.vehicle.create({ data });
    }
    return this.prisma.withTenant(this.prisma.vehicle.create({ data }));
  }

  findById(id: string): Promise<Vehicle | null> {
    return this.prisma.withTenant(
      this.prisma.vehicle.findFirst({ where: { id, deletedAt: null } }),
    );
  }

  async findViagemAtual(vehicleId: string): Promise<ViagemDoChecklist | null> {
    const vehicle = await this.prisma.withTenant(
      this.prisma.vehicle.findFirst({
        where: { id: vehicleId, deletedAt: null },
        select: {
          viagemAtual: {
            select: {
              id: true,
              codigo: true,
              data: true,
              sentido: true,
              status: true,
              iniciadaEm: true,
              finalizadaEm: true,
            },
          },
        },
      }),
    );
    return vehicle?.viagemAtual ?? null;
  }

  /**
   * `placa` é única globalmente (não apenas por tenant — ver nota no
   * schema), então esta consulta precisa de bypass de RLS para
   * detectar duplicidade mesmo com veículos de OUTRO tenant (o
   * candidato nunca vê os dados do veículo achado, apenas recebe
   * `ConflictException` do service — mesmo padrão de
   * `Company.findByCpfCnpj`, que também não filtra por tenant).
   */
  findByPlaca(placa: string): Promise<Vehicle | null> {
    return this.prisma.withBypass(this.prisma.vehicle.findFirst({ where: { placa } }));
  }

  /**
   * `withBypass` pelo mesmo motivo de `findByPlaca`: a unicidade do
   * IMEI é global, então a checagem precisa enxergar além do tenant —
   * senão o mesmo rastreador entraria em dois ônibus de empresas
   * diferentes e as duas veriam a posição uma da outra.
   */
  findByRastreadorImei(imei: string): Promise<Vehicle | null> {
    return this.prisma.withBypass(
      this.prisma.vehicle.findFirst({ where: { rastreadorImei: imei, deletedAt: null } }),
    );
  }

  findByNumeroFrota(companyId: string, numeroFrota: string): Promise<Vehicle | null> {
    return this.prisma.withBypass(
      this.prisma.vehicle.findFirst({
        where: { companyId, numeroFrota, deletedAt: null },
      }),
    );
  }

  update(id: string, data: UpdateVehicleData): Promise<Vehicle> {
    return this.prisma.withTenant(this.prisma.vehicle.update({ where: { id }, data }));
  }

  /** Ver a nota da interface: a comparação é condição do `where`, nunca um `if` antes da escrita. */
  async registrarPosicaoSeMaisRecente(
    id: string,
    data: { latitude: number; longitude: number; capturadaEm: Date },
  ): Promise<boolean> {
    const { count } = await this.prisma.withTenant(
      this.prisma.vehicle.updateMany({
        where: {
          id,
          // `null` é o primeiro sinal da vida daquele aparelho: não há
          // nada mais velho para proteger, então grava.
          OR: [{ ultimaPosicaoEm: null }, { ultimaPosicaoEm: { lt: data.capturadaEm } }],
        },
        data: {
          ultimaLatitude: data.latitude,
          ultimaLongitude: data.longitude,
          ultimaPosicaoEm: data.capturadaEm,
        },
      }),
    );
    return count > 0;
  }

  /** Ver a nota da interface para o porquê de cada parte do recorte. */
  listComRastreadorSemSinalAcrossTenants(
    limite: Date,
    dia: Date,
    max: number,
  ): Promise<
    {
      id: string;
      companyId: string;
      numeroFrota: string | null;
      placa: string;
      ultimaPosicaoEm: Date | null;
    }[]
  > {
    return this.prisma.withBypass(
      this.prisma.vehicle.findMany({
        where: {
          deletedAt: null,
          rastreadorImei: { not: null },
          // Escala publicada para hoje. Sem isto, todo ônibus de
          // reserva parado na garagem viraria um aviso.
          escalas: { some: { data: dia } },
          OR: [{ ultimaPosicaoEm: null }, { ultimaPosicaoEm: { lt: limite } }],
          // Já avisado hoje não entra de novo. A marca é escrita em
          // `marcarAvisoSemSinalEnviado`; isto aqui só evita carregar
          // o que já foi resolvido.
          AND: [
            {
              OR: [{ avisoSemSinalEnviadoEm: null }, { avisoSemSinalEnviadoEm: { lt: dia } }],
            },
          ],
        },
        select: {
          id: true,
          companyId: true,
          numeroFrota: true,
          placa: true,
          ultimaPosicaoEm: true,
        },
        take: max,
      }),
    );
  }

  /** Ver a nota da interface: a condição mora no `where`, nunca num `if` antes da escrita. */
  async marcarAvisoSemSinalEnviado(id: string, inicioDoDia: Date, agora: Date): Promise<boolean> {
    const { count } = await this.prisma.withBypass(
      this.prisma.vehicle.updateMany({
        where: {
          id,
          OR: [{ avisoSemSinalEnviadoEm: null }, { avisoSemSinalEnviadoEm: { lt: inicioDoDia } }],
        },
        data: { avisoSemSinalEnviadoEm: agora },
      }),
    );
    return count > 0;
  }

  async list(filter: ListVehiclesFilter): Promise<ListVehiclesResult> {
    const where: Prisma.VehicleWhereInput = {
      deletedAt: filter.includeDeleted ? undefined : null,
      ...(filter.companyId ? { companyId: filter.companyId } : {}),
      ...(filter.status ? { status: filter.status } : {}),
      ...(filter.tipo ? { tipo: filter.tipo } : {}),
      ...(filter.motoristaId
        ? {
            vinculos: {
              some: { papel: "MOTORISTA", userId: filter.motoristaId, encerradoEm: null },
            },
          }
        : {}),
      ...(filter.search
        ? {
            OR: [
              // Número do ônibus vem PRIMEIRO: no transporte público é
              // por ele que o despachante procura ("o 412 quebrou").
              { numeroFrota: { contains: filter.search, mode: "insensitive" } },
              { placa: { contains: filter.search, mode: "insensitive" } },
              { modelo: { contains: filter.search, mode: "insensitive" } },
              { marca: { contains: filter.search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.withTenant(
        this.prisma.vehicle.findMany({
          where,
          orderBy: { [filter.sortBy]: filter.sortOrder },
          skip: (filter.page - 1) * filter.pageSize,
          take: filter.pageSize,
        }),
      ),
      this.prisma.withTenant(this.prisma.vehicle.count({ where })),
    ]);

    return { items, total };
  }

  listAllActive(companyId: string): Promise<Vehicle[]> {
    return this.prisma.withTenant(
      this.prisma.vehicle.findMany({ where: { companyId, deletedAt: null } }),
    );
  }

  async listPendingCategoryReview(filter: {
    companyId?: string;
    page: number;
    pageSize: number;
  }): Promise<ListVehiclesResult> {
    const where: Prisma.VehicleWhereInput = {
      deletedAt: null,
      categoriaRevisaoStatus: "PENDENTE",
      ...(filter.companyId ? { companyId: filter.companyId } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.withBypass(
        this.prisma.vehicle.findMany({
          where,
          // Mais antigo primeiro — o veículo esperando revisão há mais
          // tempo aparece no topo da fila do Admin Rotta.
          orderBy: { createdAt: "asc" },
          skip: (filter.page - 1) * filter.pageSize,
          take: filter.pageSize,
        }),
      ),
      this.prisma.withBypass(this.prisma.vehicle.count({ where })),
    ]);

    return { items, total };
  }

  async listActiveResponsavelIds(vehicleId: string): Promise<string[]> {
    const rows = await this.prisma.withBypass(
      this.prisma.routeStudent.findMany({
        where: { ativo: true, route: { veiculoPadraoId: vehicleId, deletedAt: null } },
        select: { contract: { select: { responsavelId: true } } },
      }),
    );
    return [...new Set(rows.map((row) => row.contract.responsavelId))];
  }

  listVehiclesForResponsavel(responsavelId: string): Promise<Vehicle[]> {
    return this.prisma.withBypass(
      this.prisma.vehicle.findMany({
        where: {
          deletedAt: null,
          revisaoAdminStatus: { not: "PRE_APROVADO" },
          rotasPadrao: {
            some: {
              deletedAt: null,
              alunos: { some: { ativo: true, contract: { responsavelId } } },
            },
          },
        },
      }),
    );
  }

  async existsAdminReviewAcknowledgement(
    vehicleId: string,
    responsavelId: string,
    decisaoEm: Date,
  ): Promise<boolean> {
    const found = await this.prisma.withBypass(
      this.prisma.vehicleAdminReviewAcknowledgement.findUnique({
        where: { vehicleId_responsavelId_decisaoEm: { vehicleId, responsavelId, decisaoEm } },
      }),
    );
    return found !== null;
  }

  async createAdminReviewAcknowledgement(
    vehicleId: string,
    responsavelId: string,
    decisaoEm: Date,
  ): Promise<void> {
    await this.prisma.withBypass(
      this.prisma.vehicleAdminReviewAcknowledgement.create({
        data: { vehicleId, responsavelId, decisaoEm },
      }),
    );
  }
}

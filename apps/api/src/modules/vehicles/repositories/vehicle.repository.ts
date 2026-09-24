import type {
  Vehicle,
  VehicleAdminReviewStatus,
  VehicleCategory,
  VehicleCategoryOrigin,
  VehicleCategoryReviewStatus,
  VehicleStatus,
  VehicleType,
  Prisma,
} from "@prisma/client";

export interface CreateVehicleData {
  companyId: string;
  /** Número/prefixo do ônibus — ver `Vehicle.numeroFrota`, schema.prisma. */
  numeroFrota?: string | null;
  placa: string;
  modelo: string;
  marca?: string;
  ano?: number;
  cor?: string;
  renavam?: string;
  chassi?: string;
  capacidadePassageiros: number;
  tipo: VehicleType;
  categoria?: VehicleCategory;
  /** Ver `VehiclesService.resolveCategoryFields` (Frente AL) — sempre preenchido junto com `categoria`. */
  categoriaOrigem?: VehicleCategoryOrigin;
  categoriaRevisaoStatus?: VehicleCategoryReviewStatus;
  categoriaConfiancaIa?: number;
  categoriaMotivoIa?: string;
  observacoes?: string;
}

export interface UpdateVehicleData {
  numeroFrota?: string | null;
  /** Credenciamento do rastreador (só Admin Rotta) — ver `Vehicle.rastreadorImei`. */
  rastreadorImei?: string | null;
  rastreadorVinculadoEm?: Date | null;
  modelo?: string;
  marca?: string;
  ano?: number | null;
  cor?: string | null;
  renavam?: string | null;
  chassi?: string | null;
  capacidadePassageiros?: number;
  tipo?: VehicleType;
  categoria?: VehicleCategory;
  /** Ver `VehiclesService.resolveCategoryFields`/`resolveCategoryReview` (Frente AL). */
  categoriaOrigem?: VehicleCategoryOrigin;
  categoriaRevisaoStatus?: VehicleCategoryReviewStatus;
  categoriaConfiancaIa?: number | null;
  categoriaMotivoIa?: string | null;
  categoriaRevisadaPorId?: string | null;
  categoriaRevisadaEm?: Date | null;
  observacoes?: string | null;
  fotoUrl?: string;
  status?: VehicleStatus;
  /** Ver `VehiclesService.reviewVehicle` (Epic A). */
  revisaoAdminStatus?: VehicleAdminReviewStatus;
  revisaoAdminObservacaoResponsaveis?: string | null;
  revisaoAdminObservacaoTransportadora?: string | null;
  revisaoAdminDecididoPorId?: string | null;
  revisaoAdminDecididoEm?: Date | null;
  quilometragemAtual?: number;
  ultimaLatitude?: number | null;
  ultimaLongitude?: number | null;
  ultimaPosicaoEm?: Date | null;
  viagemAtualId?: string | null;
  ultimoMotoristaId?: string | null;
  ultimoMonitorId?: string | null;
  deletedAt?: Date | null;
}

export interface ListVehiclesFilter {
  search?: string;
  status?: VehicleStatus;
  tipo?: VehicleType;
  motoristaId?: string;
  /** Só relevante para Admin Rotta (bypass de RLS) — filtra por empresa específica na visão cross-tenant. */
  companyId?: string;
  page: number;
  pageSize: number;
  sortBy: "createdAt" | "placa" | "modelo" | "status";
  sortOrder: "asc" | "desc";
  includeDeleted?: boolean;
}

export interface ListVehiclesResult {
  items: Vehicle[];
  total: number;
}

/**
 * `vehicles` tem RLS por `companyId` (Dossiê 8, Seção 1 — mesmo
 * mecanismo de `Membership`/`Invite`). Toda operação passa por
 * `PrismaService.withTenant(...)`, exceto quando um `tx` explícito é
 * repassado (dentro de `runInTenantTransaction`). Defesa em
 * profundidade: `findById`/`list` também filtram `deletedAt: null`
 * explicitamente, nunca dependem apenas da RLS.
 */
export interface VehicleRepository {
  create(data: CreateVehicleData, tx?: Prisma.TransactionClient): Promise<Vehicle>;
  findById(id: string): Promise<Vehicle | null>;
  findByPlaca(placa: string): Promise<Vehicle | null>;
  /**
   * Credenciamento do rastreador — cross-tenant (IMEI é único GLOBAL:
   * o mesmo aparelho não pode estar em dois ônibus, nem que sejam de
   * empresas diferentes). Também é por aqui que o receptor TCP vai
   * traduzir "IMEI X" em "ônibus 412" quando a posição chegar.
   */
  findByRastreadorImei(imei: string): Promise<Vehicle | null>;
  /**
   * Acha o ônibus pelo NÚMERO dentro de uma empresa — a chave que o
   * Admin tem em mãos ao importar um lote de rastreadores (a planilha
   * do fornecedor traz "412", nunca o UUID). Cross-tenant na
   * implementação porque o Admin não tem tenant próprio; o `companyId`
   * explícito é o que mantém o escopo.
   */
  findByNumeroFrota(companyId: string, numeroFrota: string): Promise<Vehicle | null>;
  update(id: string, data: UpdateVehicleData): Promise<Vehicle>;
  list(filter: ListVehiclesFilter): Promise<ListVehiclesResult>;
  /** Todos os veículos ativos do tenant, sem paginação — usado pelo Dashboard/Mapa/Exportação. */
  listAllActive(companyId: string): Promise<Vehicle[]>;
  /**
   * Fila `GET /vehicles/revisao-categoria` (Frente AL, Admin Rotta) —
   * cross-tenant por natureza (o admin revisa a sugestão da IA de
   * QUALQUER empresa), então a implementação faz bypass de RLS — mesmo
   * motivo de `findByPlaca`.
   */
  listPendingCategoryReview(filter: {
    companyId?: string;
    page: number;
    pageSize: number;
  }): Promise<ListVehiclesResult>;

  /**
   * Epic A — fan-out de notificação da revisão do Admin Rotta pros
   * responsáveis das rotas ativas deste veículo (`companyId` do
   * `RouteStudent`, cross-tenant por natureza — bypass de RLS mesmo
   * motivo de `findByPlaca`/`listPendingCategoryReview`).
   */
  listActiveResponsavelIds(vehicleId: string): Promise<string[]>;
  /**
   * `GET /vehicles/pendencias-revisao-admin` (Responsável) — todo
   * veículo, de qualquer rota ativa deste responsável, com alguma
   * decisão do Admin Rotta já tomada (`revisaoAdminStatus !==
   * PRE_APROVADO`). O service filtra os já reconhecidos (ver
   * `VehiclesService.listPendingAdminReviewAcknowledgements`).
   */
  listVehiclesForResponsavel(responsavelId: string): Promise<Vehicle[]>;
  existsAdminReviewAcknowledgement(
    vehicleId: string,
    responsavelId: string,
    decisaoEm: Date,
  ): Promise<boolean>;
  createAdminReviewAcknowledgement(
    vehicleId: string,
    responsavelId: string,
    decisaoEm: Date,
  ): Promise<void>;
}

import type {
  Vehicle,
  VehicleCategory,
  VehicleCategoryOrigin,
  VehicleCategoryReviewStatus,
  VehicleStatus,
  VehicleType,
  Prisma,
} from "@prisma/client";

export interface CreateVehicleData {
  companyId: string;
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
}

import type { Contract } from "@prisma/client";

export interface CreateContractData {
  transportRequestId: string;
  studentId: string;
  responsavelId: string;
  companyId: string;
  schoolId: string;
  valorMensalidadeCentavos: number;
  planoDescricao: string;
  regras: string;
  vigenciaInicio: Date;
  vigenciaFim?: Date | null;
  vehicleId?: string | null;
  motoristaId?: string | null;
  monitorId?: string | null;
}

/** Ver nota de escopo em `TransportRequestAccessScope` (mesma convenção). */
export interface ContractAccessScope {
  responsavelId?: string;
  companyId?: string;
}

export interface ListContractsFilter extends ContractAccessScope {
  page: number;
  pageSize: number;
}

export interface ListContractsResult {
  items: Contract[];
  total: number;
}

/**
 * `contracts` TEM RLS por `companyId` (ver nota em
 * `TransportRequestRepository`, mesmo mecanismo). Diferente daquele
 * repositório: `create`/`updateAsEmpresa` são sempre chamados pela
 * Empresa/Gestor dona do contrato (contexto ambiente JÁ é o `companyId`
 * certo) — usam `withTenant` normalmente. Só `updateAsResponsavel`
 * (assinatura do Responsável) precisa de `withBypass` explícito, pelo
 * mesmo motivo já documentado em `TransportRequestRepository.create`.
 */
export interface ContractRepository {
  create(data: CreateContractData): Promise<Contract>;
  findByTransportRequestId(transportRequestId: string): Promise<Contract | null>;
  findByIdScoped(id: string, scope: ContractAccessScope): Promise<Contract | null>;
  /** Sem escopo — só Admin Rotta. */
  findById(id: string): Promise<Contract | null>;
  /** Assinatura/atualização pela Empresa dona do contrato (contexto ambiente = `companyId`, `withTenant` basta). */
  updateAsEmpresa(id: string, data: Partial<Contract>): Promise<Contract>;
  /** Assinatura do Responsável — sempre bypass (ver nota da interface). */
  updateAsResponsavel(id: string, data: Partial<Contract>): Promise<Contract>;
  list(filter: ListContractsFilter): Promise<ListContractsResult>;
}

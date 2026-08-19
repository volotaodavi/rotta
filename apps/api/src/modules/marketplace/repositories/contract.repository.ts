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

/** Ver nota de `ContractRepository.createTermoCienciaAutomatico`. */
export interface CreateTermoCienciaData {
  transportRequestId: string;
  studentId: string;
  responsavelId: string;
  companyId: string;
  schoolId: string;
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
 * certo) — usam `withTenant` normalmente. `updateAsResponsavel`
 * (assinatura do Responsável) e `activate` (briefing "ROTTA AI" pós-
 * assinatura — pode ser disparada por QUALQUER um dos dois lados,
 * conforme quem assina por último) sempre usam `withBypass` explícito,
 * pelo mesmo motivo já documentado em `TransportRequestRepository.create`.
 */
export interface ContractRepository {
  create(data: CreateContractData): Promise<Contract>;
  /**
   * Cria o Contract já `ATIVO` com `origem: TERMO_CIENCIA_AUTOMATICO` e
   * termos comerciais placeholder ("a definir") — chamada por
   * `StudentCredentialedListener`, disparada por um evento sem contexto
   * de tenant (o `Student` acabou de ser criado pelo Responsável, não
   * pela Empresa), por isso sempre `withBypass`, mesmo motivo de
   * `TransportRequestRepository.create`.
   */
  createTermoCienciaAutomatico(data: CreateTermoCienciaData): Promise<Contract>;
  findByTransportRequestId(transportRequestId: string): Promise<Contract | null>;
  findByIdScoped(id: string, scope: ContractAccessScope): Promise<Contract | null>;
  /** Sem escopo — só Admin Rotta. */
  findById(id: string): Promise<Contract | null>;
  /** Assinatura/atualização pela Empresa dona do contrato (contexto ambiente = `companyId`, `withTenant` basta). */
  updateAsEmpresa(id: string, data: Partial<Contract>): Promise<Contract>;
  /** Assinatura do Responsável — sempre bypass (ver nota da interface). */
  updateAsResponsavel(id: string, data: Partial<Contract>): Promise<Contract>;
  /** Ativação automática (`status: ATIVO`, `ativadoEm`) — sempre bypass (ver nota da interface). */
  activate(id: string): Promise<Contract>;
  list(filter: ListContractsFilter): Promise<ListContractsResult>;
}

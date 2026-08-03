import type { SchoolShift, TransportRequest, TransportRequestStatus } from "@prisma/client";

export interface CreateTransportRequestData {
  studentId: string;
  responsavelId: string;
  companyId: string;
  schoolId: string;
  turno: SchoolShift;
}

/**
 * Escopo de acesso — `responsavelId` (Responsável) e `companyId`
 * (Empresa/Gestor) são MUTUAMENTE EXCLUSIVOS na prática (cada ator só
 * preenche o seu), nunca ambos ao mesmo tempo. `undefined`/`{}` (só
 * Admin Rotta) significa "sem restrição adicional além do bypass
 * ambiente já concedido pelo `TenantGuard`".
 */
export interface TransportRequestAccessScope {
  responsavelId?: string;
  companyId?: string;
}

export interface ListTransportRequestsFilter extends TransportRequestAccessScope {
  status?: TransportRequestStatus;
  page: number;
  pageSize: number;
}

export interface ListTransportRequestsResult {
  items: TransportRequest[];
  total: number;
}

export interface UpdateTransportRequestStatusData {
  status: TransportRequestStatus;
  motivoRecusa?: string | null;
}

/**
 * `transport_requests` TEM RLS por `companyId` (Dossiê 8 §15.2 — ver
 * nota em `schema.prisma`, model `TransportRequest`). A escrita
 * (`create`) é sempre feita pelo Responsável (sem `companyId` próprio no
 * contexto ambiente) — por isso usa `withBypass` incondicionalmente,
 * mesmo bug de RLS já corrigido uma vez em
 * `PrismaAuditLogRepository.record` (escrita sob contexto ambiente que
 * não corresponde à coluna de RLS falha silenciosamente o `WITH CHECK`).
 * Leitura por Empresa/Gestor usa `withTenant` normalmente (o contexto
 * ambiente JÁ é o `companyId` certo, RLS filtra sozinha); leitura por
 * Responsável usa `withBypass` + filtro explícito por `responsavelId`
 * (mesmo padrão do módulo Alunos para Empresa/Motorista lendo `Student`).
 */
export interface TransportRequestRepository {
  create(data: CreateTransportRequestData): Promise<TransportRequest>;
  findByIdScoped(id: string, scope: TransportRequestAccessScope): Promise<TransportRequest | null>;
  /** Sem escopo — só Admin Rotta (bypass já concedido pelo `TenantGuard`). */
  findById(id: string): Promise<TransportRequest | null>;
  /** Checagem de duplicidade (briefing: não permitir 2 solicitações simultâneas para o mesmo par aluno/empresa) — sempre bypass, chamada durante `create`. */
  findOpenByStudentAndCompany(
    studentId: string,
    companyId: string,
  ): Promise<TransportRequest | null>;
  updateStatus(id: string, data: UpdateTransportRequestStatusData): Promise<TransportRequest>;
  list(filter: ListTransportRequestsFilter): Promise<ListTransportRequestsResult>;
}

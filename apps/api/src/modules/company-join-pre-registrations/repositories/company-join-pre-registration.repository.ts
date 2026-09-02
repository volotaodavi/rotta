import type { CompanyJoinPreRegistration, CompanyJoinPreRegistrationStatus } from "@prisma/client";

export interface CreateCompanyJoinPreRegistrationData {
  companyId: string;
  criadoPorId: string;
  role: string;
  nome: string | null;
  celular: string | null;
}

export interface MatchCompanyJoinPreRegistrationCriteria {
  nome: string | null;
  celular: string | null;
}

export interface MarkVinculadoData {
  vinculadoUserId: string;
  vinculadoEm: Date;
}

/**
 * `company_join_pre_registrations` tem RLS por `companyId` (mesmo padrão
 * do resto do Dossiê 8) — `create`/`listByCompany`/`cancel` são chamados
 * de dentro do tenant da empresa (`withTenant`). `findMatchingPending` é
 * a exceção: chamado por `CompanyJoinRequestsService.create`, que roda
 * ANTES de o solicitante ter qualquer tenant — usa `withBypass`, mesmo
 * mecanismo de `CompanyJoinRequestRepository.create`.
 */
export interface CompanyJoinPreRegistrationRepository {
  create(data: CreateCompanyJoinPreRegistrationData): Promise<CompanyJoinPreRegistration>;
  listByCompany(companyId: string): Promise<CompanyJoinPreRegistration[]>;
  findById(id: string): Promise<CompanyJoinPreRegistration | null>;
  cancel(id: string): Promise<CompanyJoinPreRegistration>;
  /**
   * Só `status = PENDENTE` de uma empresa+papel — bate se `celular`
   * (dígitos) OU `nome` (case-insensitive, trim) corresponder ao
   * candidato. Nunca cruza papéis (um pré-cadastro de Motorista não
   * libera um Monitor, e vice-versa).
   */
  findMatchingPending(
    companyId: string,
    role: string,
    criteria: MatchCompanyJoinPreRegistrationCriteria,
  ): Promise<CompanyJoinPreRegistration | null>;
  markVinculado(id: string, data: MarkVinculadoData): Promise<CompanyJoinPreRegistration>;
}

export type { CompanyJoinPreRegistration, CompanyJoinPreRegistrationStatus };

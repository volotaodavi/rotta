import type { CompanyJoinRequest, CompanyJoinRequestStatus, User } from "@prisma/client";

export type CompanyJoinRequestWithCompany = CompanyJoinRequest & {
  company: { id: string; nomeFantasia: string };
};

export type CompanyJoinRequestWithUser = CompanyJoinRequest & {
  company: { id: string; nomeFantasia: string };
  user: Pick<User, "id" | "nome" | "email" | "telefone">;
};

export interface CreateCompanyJoinRequestData {
  companyId: string;
  userId: string;
  role: string;
  /**
   * Omitido = `PENDENTE` (default do schema, fluxo de sempre). Passado
   * como `APROVADO` só quando `CompanyJoinRequestsService.create` acha
   * um `CompanyJoinPreRegistration` batendo — junto com `decidedAt` e
   * `preRegistrationId`, nunca um sozinho.
   */
  status?: CompanyJoinRequestStatus;
  decidedAt?: Date;
  preRegistrationId?: string;
}

export interface DecideCompanyJoinRequestData {
  status: CompanyJoinRequestStatus;
  motivoRecusa?: string;
  decididoPorId: string;
  decidedAt: Date;
}

/**
 * `company_join_requests` não é multi-tenant no sentido de RLS por
 * `app.tenant_id` como as demais tabelas do Dossiê 8 — o solicitante
 * ainda não tem tenant nenhum. `findPendingByCompany`/`decide` SÃO
 * chamados de dentro do tenant da empresa que decide (via
 * `PrismaService.withTenant`, mesmo padrão do resto do módulo Empresas),
 * mas `create`/`findActiveByUser` (chamados pelo próprio solicitante,
 * sem tenant) usam `withBypass` — mesmo mecanismo de
 * `TransporterRepository`/`CompanyRepository.findActiveByCodigoInterno`.
 */
export interface CompanyJoinRequestRepository {
  create(data: CreateCompanyJoinRequestData): Promise<CompanyJoinRequestWithCompany>;
  /** Pedido `PENDENTE` ou `RECUSADO` mais recente do usuário (tela "aguardando aprovação"/"recusado" no app). */
  findLatestByUser(userId: string): Promise<CompanyJoinRequestWithCompany | null>;
  findById(id: string): Promise<CompanyJoinRequestWithUser | null>;
  findPendingByCompany(companyId: string): Promise<CompanyJoinRequestWithUser[]>;
  decide(id: string, data: DecideCompanyJoinRequestData): Promise<CompanyJoinRequest>;
}

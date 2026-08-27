import type { Prisma, SupportTicketCategoria, SupportTicketStatus } from "@prisma/client";

/** `include` compartilhado entre listagem e detalhe — nomes exibidos sem exigir uma segunda consulta. */
export const SUPPORT_TICKET_INCLUDE = {
  company: { select: { id: true, nomeFantasia: true, cpfCnpj: true } },
  abertoPor: { select: { id: true, nome: true, email: true } },
  encerradoPor: { select: { id: true, nome: true } },
} satisfies Prisma.SupportTicketInclude;

export type SupportTicketWithRelations = Prisma.SupportTicketGetPayload<{
  include: typeof SUPPORT_TICKET_INCLUDE;
}>;

export interface CreateSupportTicketData {
  companyId: string;
  abertoPorUserId: string;
  assunto: string;
  descricao: string;
  categoria: SupportTicketCategoria;
  anexoUrl?: string;
}

/**
 * `companyId: undefined` = Admin Rotta consultando cross-tenant (`SUP-01`:
 * "Admin Rotta visualiza todos") — resolvido via `withBypass` na
 * implementação Prisma; `companyId` presente é sempre o caso
 * Empresa/Gestor (RLS via `withTenant`).
 */
export interface ListSupportTicketsFilter {
  companyId?: string;
  /** Escopo do Responsável (Epic B) — só os chamados que ELE abriu, nunca o tenant inteiro (ver `SupportService.resolveTicketScope`). */
  abertoPorUserId?: string;
  status?: SupportTicketStatus;
  categoria?: SupportTicketCategoria;
  page: number;
  pageSize: number;
}

export interface ListSupportTicketsResult {
  items: SupportTicketWithRelations[];
  total: number;
}

export interface UpdateSupportTicketStatusData {
  status: SupportTicketStatus;
  encerradoEm?: Date | null;
  encerradoPorUserId?: string | null;
}

export interface SupportTicketRepository {
  create(data: CreateSupportTicketData): Promise<SupportTicketWithRelations>;
  /**
   * Abertura por `Role.RESPONSAVEL` (Epic B) — bypass explícito de RLS
   * (Responsável não pertence ao tenant da transportadora, mesmo motivo
   * de `ContractRepository.updateAsResponsavel`; ver nota de
   * `TenantGuard` sobre `bypass: false` do Responsável).
   */
  createBypass(data: CreateSupportTicketData): Promise<SupportTicketWithRelations>;
  /** `abertoPorUserId` = escopo do Responsável (Epic B): só o próprio chamado, nunca o tenant inteiro. */
  findById(
    id: string,
    companyId?: string,
    abertoPorUserId?: string,
  ): Promise<SupportTicketWithRelations | null>;
  list(filter: ListSupportTicketsFilter): Promise<ListSupportTicketsResult>;
  updateStatus(
    id: string,
    data: UpdateSupportTicketStatusData,
  ): Promise<SupportTicketWithRelations>;
  /** Resposta/reabertura/fechamento pelo Responsável — mesmo motivo de `createBypass`. */
  updateStatusBypass(
    id: string,
    data: UpdateSupportTicketStatusData,
  ): Promise<SupportTicketWithRelations>;
}

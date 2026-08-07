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
  findById(id: string, companyId?: string): Promise<SupportTicketWithRelations | null>;
  list(filter: ListSupportTicketsFilter): Promise<ListSupportTicketsResult>;
  updateStatus(
    id: string,
    data: UpdateSupportTicketStatusData,
  ): Promise<SupportTicketWithRelations>;
}

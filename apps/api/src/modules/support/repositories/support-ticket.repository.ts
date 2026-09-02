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
  /** Gerado em `SupportService.gerarProtocolo()` antes do insert — ver doc do campo no schema. */
  protocolo: string;
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
  /**
   * `false` (padrão) esconde os arquivados — "nunca aparece na listagem
   * padrão do Admin" (pedido do usuário 02/09/2026); `true` mostra só os
   * arquivados (aba/filtro dedicado). Nunca `undefined` chegando aqui —
   * `SupportService.listTickets` já resolve o padrão antes de repassar.
   */
  arquivado: boolean;
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

export interface UpdateSupportTicketArquivadoData {
  arquivado: boolean;
  arquivadoEm: Date | null;
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
  /** Resumo gerado pela IA de suporte (`SupportAiService.processarChamado`) — best-effort, ver `SupportService`. */
  updateResumoIA(id: string, resumoIA: string): Promise<SupportTicketWithRelations>;
  /** Mesmo motivo de `createBypass` — ticket aberto por `Role.RESPONSAVEL`. */
  updateResumoIABypass(id: string, resumoIA: string): Promise<SupportTicketWithRelations>;
  /**
   * Arquivar/desarquivar (pedido do usuário 02/09/2026) — ação só de
   * Empresa/Gestor/Admin Rotta (nunca Responsável), por isso sem
   * variante bypass, mesmo padrão de `updateStatus`.
   */
  setArquivado(
    id: string,
    data: UpdateSupportTicketArquivadoData,
  ): Promise<SupportTicketWithRelations>;
}

import type { StatusPillTone } from "@/features/vehicles/components";
import type { SupportTicketCategoria, SupportTicketStatus } from "@rotta/api-client";

/** Mesmos rótulos de `apps/web/.../chamados/novo/page.tsx` (Epic B — paridade mobile). */
export const SUPPORT_TICKET_CATEGORIA_LABEL: Record<SupportTicketCategoria, string> = {
  DUVIDA: "Dúvida",
  PROBLEMA_TECNICO: "Problema técnico",
  COBRANCA: "Cobrança",
  OUTRO: "Outro",
};

/** Mesmos rótulos/tons de `SupportTicketStatusBadge` (versão web). */
export const SUPPORT_TICKET_STATUS_LABEL: Record<SupportTicketStatus, string> = {
  ABERTO: "Aberto",
  EM_ANDAMENTO: "Em andamento",
  ENCERRADO: "Encerrado",
};

export const SUPPORT_TICKET_STATUS_TONE: Record<SupportTicketStatus, StatusPillTone> = {
  ABERTO: "warning",
  EM_ANDAMENTO: "info",
  ENCERRADO: "neutral",
};

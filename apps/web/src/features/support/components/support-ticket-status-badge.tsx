import { Badge } from "@rotta/ui/web";

import type { SupportTicketStatus } from "@rotta/api-client";

const LABELS: Record<SupportTicketStatus, string> = {
  ABERTO: "Aberto",
  EM_ANDAMENTO: "Em andamento",
  ENCERRADO: "Encerrado",
};

const VARIANTS: Record<SupportTicketStatus, "warning" | "info" | "neutral"> = {
  ABERTO: "warning",
  EM_ANDAMENTO: "info",
  ENCERRADO: "neutral",
};

export function SupportTicketStatusBadge({ status }: { status: SupportTicketStatus }): JSX.Element {
  return <Badge variant={VARIANTS[status]}>{LABELS[status]}</Badge>;
}

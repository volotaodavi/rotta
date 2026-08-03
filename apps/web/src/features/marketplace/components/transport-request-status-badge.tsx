import { Badge, type BadgeVariant } from "@rotta/ui/web";

import type { TransportRequestStatus } from "@rotta/api-client";

export const TRANSPORT_REQUEST_STATUS_LABEL: Record<TransportRequestStatus, string> = {
  RECEBIDA: "Recebida",
  EM_ANALISE: "Em análise",
  APROVADA: "Aprovada",
  RECUSADA: "Recusada",
};

const STATUS_VARIANT: Record<TransportRequestStatus, BadgeVariant> = {
  RECEBIDA: "info",
  EM_ANALISE: "warning",
  APROVADA: "success",
  RECUSADA: "danger",
};

export function TransportRequestStatusBadge({
  status,
}: {
  status: TransportRequestStatus;
}): JSX.Element {
  return <Badge variant={STATUS_VARIANT[status]}>{TRANSPORT_REQUEST_STATUS_LABEL[status]}</Badge>;
}

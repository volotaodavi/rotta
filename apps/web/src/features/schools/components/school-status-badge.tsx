import { Badge, type BadgeVariant } from "@rotta/ui/web";

import type { SchoolStatus } from "@rotta/api-client";

export const SCHOOL_STATUS_LABEL: Record<SchoolStatus, string> = {
  ATIVA: "Ativa",
  INATIVA: "Inativa",
  EM_ANALISE: "Em análise",
  ARQUIVADA: "Arquivada",
};

const STATUS_VARIANT: Record<SchoolStatus, BadgeVariant> = {
  ATIVA: "success",
  INATIVA: "neutral",
  EM_ANALISE: "warning",
  ARQUIVADA: "danger",
};

export function SchoolStatusBadge({ status }: { status: SchoolStatus }): JSX.Element {
  return <Badge variant={STATUS_VARIANT[status]}>{SCHOOL_STATUS_LABEL[status]}</Badge>;
}

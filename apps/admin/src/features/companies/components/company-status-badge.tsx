import { Badge, type BadgeVariant } from "@rotta/ui/web";

import type { CompanyStatus } from "@rotta/api-client";

const STATUS_LABEL: Record<CompanyStatus, string> = {
  TRIAL: "Trial",
  ATIVO: "Ativo",
  SUSPENSO: "Suspenso",
  CANCELADO: "Cancelado",
  INADIMPLENTE: "Inadimplente",
};

const STATUS_VARIANT: Record<CompanyStatus, BadgeVariant> = {
  TRIAL: "info",
  ATIVO: "success",
  SUSPENSO: "warning",
  CANCELADO: "neutral",
  INADIMPLENTE: "danger",
};

export function CompanyStatusBadge({ status }: { status: CompanyStatus }): JSX.Element {
  return <Badge variant={STATUS_VARIANT[status]}>{STATUS_LABEL[status]}</Badge>;
}

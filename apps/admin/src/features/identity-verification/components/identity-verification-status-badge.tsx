import { Badge, type BadgeVariant } from "@rotta/ui/web";

import type { IdentityVerificationStatus } from "@rotta/api-client";

const LABEL: Record<IdentityVerificationStatus, string> = {
  NAO_INICIADA: "Não iniciada",
  EM_ANDAMENTO: "Em andamento",
  EM_ANALISE: "Em análise",
  APROVADA: "Aprovada",
  REPROVADA: "Reprovada",
  EXPIRADA: "Expirada",
};

const VARIANT: Record<IdentityVerificationStatus, BadgeVariant> = {
  NAO_INICIADA: "neutral",
  EM_ANDAMENTO: "info",
  EM_ANALISE: "warning",
  APROVADA: "success",
  REPROVADA: "danger",
  EXPIRADA: "neutral",
};

export function IdentityVerificationStatusBadge({
  status,
}: {
  status: IdentityVerificationStatus;
}): JSX.Element {
  return <Badge variant={VARIANT[status]}>{LABEL[status]}</Badge>;
}

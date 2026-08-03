import { Badge, type BadgeVariant } from "@rotta/ui/web";

import type { ContractStatus } from "@rotta/api-client";

export const CONTRACT_STATUS_LABEL: Record<ContractStatus, string> = {
  AGUARDANDO_ASSINATURA: "Aguardando assinatura",
  ATIVO: "Ativo",
  ENCERRADO: "Encerrado",
};

const STATUS_VARIANT: Record<ContractStatus, BadgeVariant> = {
  AGUARDANDO_ASSINATURA: "warning",
  ATIVO: "success",
  ENCERRADO: "neutral",
};

export function ContractStatusBadge({ status }: { status: ContractStatus }): JSX.Element {
  return <Badge variant={STATUS_VARIANT[status]}>{CONTRACT_STATUS_LABEL[status]}</Badge>;
}

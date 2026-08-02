import { Badge, type BadgeVariant } from "@rotta/ui/web";

import type { VehicleStatus } from "@rotta/api-client";

export const VEHICLE_STATUS_LABEL: Record<VehicleStatus, string> = {
  DISPONIVEL: "Disponível",
  EM_VIAGEM: "Em viagem",
  MANUTENCAO: "Manutenção",
  RESERVA: "Reserva",
  INATIVO: "Inativo",
  BLOQUEADO: "Bloqueado",
};

const STATUS_VARIANT: Record<VehicleStatus, BadgeVariant> = {
  DISPONIVEL: "success",
  EM_VIAGEM: "info",
  MANUTENCAO: "warning",
  RESERVA: "neutral",
  INATIVO: "neutral",
  BLOQUEADO: "danger",
};

export function VehicleStatusBadge({ status }: { status: VehicleStatus }): JSX.Element {
  return <Badge variant={STATUS_VARIANT[status]}>{VEHICLE_STATUS_LABEL[status]}</Badge>;
}

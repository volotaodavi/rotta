import { Badge } from "@rotta/ui/web";

import type { Vehicle } from "@rotta/api-client";

/**
 * Frente AL — "requer análise/verificação" (pedido do usuário). Só
 * renderiza quando faz sentido: chip "Sugerida pela IA" aparece sempre
 * que `categoriaOrigem === "IA"` (mesmo já confirmada/corrigida, é
 * histórico útil); o badge de aviso só aparece enquanto
 * `categoriaRevisaoStatus === "PENDENTE"` (a empresa continua usando a
 * categoria sugerida normalmente enquanto isso, ver `VehiclesService`).
 */
export function VehicleCategoryReviewBadges({
  vehicle,
}: {
  vehicle: Pick<Vehicle, "categoriaOrigem" | "categoriaRevisaoStatus" | "categoriaConfiancaIa">;
}): JSX.Element | null {
  if (vehicle.categoriaOrigem !== "IA") return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge variant="info">
        Sugerida pela IA
        {vehicle.categoriaConfiancaIa !== null
          ? ` (confiança ${vehicle.categoriaConfiancaIa}%)`
          : ""}
      </Badge>
      {vehicle.categoriaRevisaoStatus === "PENDENTE" && (
        <Badge variant="warning">Requer verificação</Badge>
      )}
    </div>
  );
}

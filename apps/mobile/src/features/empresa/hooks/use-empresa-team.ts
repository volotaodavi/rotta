import { useQuery } from "@tanstack/react-query";

import { driversApi } from "@/lib/api-client";

/**
 * Hooks de Equipe pro lado da Empresa/Gestor. `useMyTeam` nasceu aqui na
 * Frente 4 (Rotas) — a lista de rotas precisa cruzar `motoristaPadraoId`
 * com o nome do motorista, mesma solução da Web
 * (`apps/web/.../rotas/page.tsx`: `useMyTeam` + `team?.find(...)`). O
 * resto de Equipe (pedidos pendentes, convites) entra na Frente 5.
 */
export function useMyTeam() {
  return useQuery({
    queryKey: ["empresa", "team"],
    queryFn: () => driversApi.listTeam(),
  });
}

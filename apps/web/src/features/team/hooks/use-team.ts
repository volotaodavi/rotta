"use client";

import { useQuery } from "@tanstack/react-query";

import { driversApi } from "@/lib/api-client";

/**
 * Equipe da própria empresa (Frente K — Motoristas/Monitores/Gestores,
 * `GET /drivers/team`) — inclui o status de verificação de identidade
 * Didit de cada um. Resolve o gap que motivou esta frente: antes,
 * EMPRESA/GESTOR não tinham NENHUMA tela pra ver se a Didit já tinha
 * decidido sobre um motorista/monitor.
 */
export function useMyTeam() {
  return useQuery({
    queryKey: ["team", "me"],
    queryFn: () => driversApi.listTeam(),
  });
}

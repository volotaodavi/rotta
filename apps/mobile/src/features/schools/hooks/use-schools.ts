import { useQuery } from "@tanstack/react-query";

import { schoolsApi } from "@/lib/api-client";

/**
 * Hooks de dados do módulo Escolas no app mobile (Dossiê 23, Secao
 * 2.2) — escopo do Motorista/Monitor: somente leitura (briefing
 * "PERMISSÕES" — Motorista/Monitor só visualizam escolas vinculadas
 * às suas rotas; nunca cadastram/editam escola, portão ou vínculo de
 * empresa). `schoolsApi.list()`/`getById()` já aplicam esse recorte no
 * backend a partir do papel do ator autenticado — nenhum filtro
 * adicional é necessário aqui (mesma garantia de `useMyVehicle`).
 */
export function useSchoolsList() {
  return useQuery({
    queryKey: ["schools"],
    queryFn: () => schoolsApi.list({ pageSize: 50 }),
  });
}

export function useSchool(schoolId: string | undefined) {
  return useQuery({
    queryKey: ["schools", schoolId],
    queryFn: () => schoolsApi.getById(schoolId as string),
    enabled: Boolean(schoolId),
  });
}

export function useSchoolAccessPoints(schoolId: string | undefined) {
  return useQuery({
    queryKey: ["schools", schoolId, "access-points"],
    queryFn: () => schoolsApi.listAccessPoints(schoolId as string),
    enabled: Boolean(schoolId),
  });
}

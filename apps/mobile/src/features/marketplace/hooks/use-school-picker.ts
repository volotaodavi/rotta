import { useQuery } from "@tanstack/react-query";

import { schoolsApi } from "@/lib/api-client";

/**
 * Busca de escolas do catálogo compartilhado (briefing "Gestão de
 * Escolas") para o seletor de escola do cadastro inline de aluno em
 * `SolicitarTransporteScreen` — o Responsável escolhe a escola do filho
 * antes de poder concluir a solicitação de transporte.
 */
export function useSchoolsSearch(search: string) {
  return useQuery({
    queryKey: ["schools", "search", search],
    queryFn: () => schoolsApi.list({ search: search.trim() || undefined, pageSize: 20 }),
  });
}

import { useQuery } from "@tanstack/react-query";

import { schoolsApi } from "@/lib/api-client";

import type { SuggestSchoolsResult } from "@rotta/api-client";

/**
 * Busca de escolas do catálogo compartilhado para o seletor de escola do
 * cadastro inline de aluno (`SolicitarTransporteScreen`/`MapaScreen`) —
 * o Responsável escolhe a escola do filho.
 *
 * ACHADO REAL (pedido do usuário: "quando for digitar uma escola, além
 * do nome, veja a localização mais próxima... está bugando na hora de
 * escolher a escola do aluno"): usava `schoolsApi.list({ search })` —
 * substring EXATA (Frente U/`sugerirEscolas` nunca chegou no mobile, só
 * na web, `alunos/novo/page.tsx`) — qualquer erro de digitação devolvia
 * zero resultados, sensação de tela quebrada. Troca pro mesmo `GET
 * /schools/sugestoes` da web (distância de edição tolerante a erro de
 * digitação + reordenação por proximidade quando `coords` é informado).
 * `coords` é opcional e vem de fora (nunca pede localização aqui dentro
 * — quem chama já tem seu próprio `useLocation()`, ex. `MapaScreen`;
 * evita duas requisições de permissão de GPS concorrentes na mesma tela).
 */
export function useSchoolsSearch(
  search: string,
  coords?: { latitude: number; longitude: number } | null,
): { data: SuggestSchoolsResult | undefined; isLoading: boolean } {
  const termo = search.trim();

  return useQuery({
    queryKey: ["schools", "sugestoes", termo, coords?.latitude, coords?.longitude],
    queryFn: () =>
      schoolsApi.sugerir({
        q: termo,
        latitude: coords?.latitude,
        longitude: coords?.longitude,
        limit: 20,
      }),
    enabled: termo.length >= 2,
  });
}

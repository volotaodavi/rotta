"use client";

import { useQuery } from "@tanstack/react-query";

import { seteApi } from "@/lib/api-client";

/**
 * Dados da integração com o SETE (FNDE) — `docs/52-integracao-sete.md`.
 *
 * ## Por que `enabled` e não um `if` na tela
 *
 * As duas rotas exigem a habilitação `LICITADA` no backend
 * (RN-SETE-01): uma empresa só privada recebe 403. Se a tela montasse o
 * hook sem condição, o painel de toda transportadora privada faria duas
 * chamadas por visita só para colecionar erro — e o 403 apareceria no
 * monitoramento como se algo estivesse quebrado.
 *
 * ## Sem `refetchInterval`
 *
 * Pendência de cadastro não muda sozinha: muda quando alguém corrige o
 * cadastro. Quem corrige volta a esta tela, e aí a `queryKey` já é
 * invalidada pela navegação.
 */
export function useSetePendencias(habilitado: boolean) {
  return useQuery({
    queryKey: ["sete", "pendencias"],
    queryFn: () => seteApi.listarPendencias(),
    enabled: habilitado,
  });
}

/**
 * Município da área de atuação, para a tela sugerir o código IBGE.
 *
 * `codigoIbge` vem `null` quando a Rotta não conhece o código daquele
 * município — a Rotta não tem tabela do IBGE, e inventar seis dígitos
 * parecidos seria pior que pedir para a pessoa digitar (RN-SETE-09).
 */
export function useSeteMunicipio(habilitado: boolean) {
  return useQuery({
    queryKey: ["sete", "municipio"],
    queryFn: () => seteApi.sugerirMunicipio(),
    enabled: habilitado,
    // O município de atuação não muda de uma hora para a outra.
    staleTime: 5 * 60 * 1000,
  });
}

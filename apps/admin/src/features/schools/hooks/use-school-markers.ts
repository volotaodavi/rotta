"use client";

import { useQuery } from "@tanstack/react-query";

import type { BoundingBoxInput } from "@rotta/api-client";

import { geoApi } from "@/lib/api-client";

/** Marcadores de Escola para o mapa (Map Intelligence Agent, `GET /geo/mapa/marcadores`) — briefing "MAPA". */
export function useSchoolMarkers(bounds: BoundingBoxInput | null) {
  return useQuery({
    queryKey: ["geo", "mapa", "marcadores", bounds],
    queryFn: () => geoApi.listMarkers(bounds!),
    enabled: bounds !== null,
    /*
      Fora da atualização automática (02/10/2026): a consulta devolve
      todas as escolas do retângulo visível do mapa, e o catálogo do
      Censo muda por sincronização manual, não de minuto em minuto.
      Já refaz sozinha no que importa, que é mover ou dar zoom no mapa
      (os `bounds` entram na `queryKey`).
    */
    refetchInterval: false,
  });
}

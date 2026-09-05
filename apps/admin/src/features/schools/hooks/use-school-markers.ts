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
  });
}

"use client";

import { useQuery } from "@tanstack/react-query";

import type { Coordenada } from "@rotta/api-client";

import { geoApi } from "@/lib/api-client";


export interface RoutePreviewPoint {
  latitude: number;
  longitude: number;
}

/**
 * Prévia de rota (OSRM, via Rotta Geo Engine) entre duas coordenadas já
 * conhecidas — diferente de `use-traced-route.ts` (que geocodifica um
 * endereço em texto livre primeiro), aqui as duas pontas já têm
 * lat/lng confirmados (ex.: `student.embarqueLatitude/Longitude`,
 * salvos no cadastro, e `school.latitude/longitude`), então pula
 * direto pra `/geo/rota-previa` — nunca chama o Nominatim de novo à
 * toa. Usado pela tela "De/Para" (Frente Q) que aparece assim que o
 * Responsável termina de cadastrar o aluno, antes de qualquer viagem
 * existir de verdade.
 */
export function useRoutePreview(
  origem: Coordenada | null,
  destino: Coordenada | null,
): {
  route: RoutePreviewPoint[] | null;
  distanciaMetros: number | null;
  duracaoSegundos: number | null;
  isLoading: boolean;
  isError: boolean;
} {
  const query = useQuery({
    queryKey: [
      "geo",
      "rota-previa",
      origem?.latitude,
      origem?.longitude,
      destino?.latitude,
      destino?.longitude,
    ],
    queryFn: () => geoApi.getRoutePreview({ origem: origem!, destino: destino! }),
    enabled: Boolean(origem && destino),
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const route: RoutePreviewPoint[] | null = query.data
    ? query.data.geometria.coordinates.map(([longitude, latitude]) => ({ latitude, longitude }))
    : null;

  return {
    route,
    distanciaMetros: query.data?.distanciaMetros ?? null,
    duracaoSegundos: query.data?.duracaoSegundos ?? null,
    isLoading: query.isFetching,
    isError: query.isError,
  };
}

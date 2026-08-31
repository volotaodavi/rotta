import { haversineDistanceMeters } from "@rotta/maps/distance";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

import type { Coordenada } from "@rotta/api-client";

import { geoApi } from "@/lib/api-client";

/** Distância mínima que o veículo precisa ter andado para valer a pena recalcular a rota (OSRM). */
const RECALCULO_MINIMO_METROS = 60;
/** Intervalo mínimo entre recálculos, mesmo que o veículo já tenha andado o suficiente. */
const RECALCULO_MINIMO_MS = 15_000;

export interface TracedRoutePoint {
  latitude: number;
  longitude: number;
}

/**
 * Porta direta de `apps/web/src/features/gps/hooks/use-next-stop-traced-route.ts`
 * (mesma lógica, zero dependência de DOM — só `@tanstack/react-query` +
 * `geoApi`, ambos já disponíveis aqui) — a "linha azul" de verdade
 * (pedido do usuário: "a linha azul é igual GPS mesmo... para os
 * responsáveis... isso deve ser para web e app"). Faltava só no app
 * mobile do Responsável (`TripTrackingOverlay`/`AcompanhamentoSection`,
 * `transporte-inicio-screen.tsx`) — a versão web já traçava via OSRM
 * desde a Frente de "linha azul" original.
 *
 * Nunca recalcula a cada ping de GPS — só quando o destino muda (a vez
 * passou para o próximo aluno) OU o veículo já andou pelo menos
 * `RECALCULO_MINIMO_METROS` E já se passou `RECALCULO_MINIMO_MS` desde o
 * último cálculo.
 */
export function useNextStopTracedRoute(
  origem: Coordenada | null,
  destino: Coordenada | null,
): {
  route: TracedRoutePoint[] | null;
  distanciaMetros: number | null;
  duracaoSegundos: number | null;
  isLoading: boolean;
} {
  const [origemParaRota, setOrigemParaRota] = useState<Coordenada | null>(null);
  const ultimoCalculoRef = useRef<{ origem: Coordenada; em: number } | null>(null);

  useEffect(() => {
    if (!origem) return;
    const ultimo = ultimoCalculoRef.current;
    const deveRecalcular =
      !ultimo ||
      (haversineDistanceMeters(ultimo.origem, origem) >= RECALCULO_MINIMO_METROS &&
        Date.now() - ultimo.em >= RECALCULO_MINIMO_MS);
    if (deveRecalcular) {
      ultimoCalculoRef.current = { origem, em: Date.now() };
      setOrigemParaRota(origem);
    }
  }, [origem]);

  const query = useQuery({
    queryKey: [
      "geo",
      "rota-previa",
      "proxima-parada",
      origemParaRota?.latitude,
      origemParaRota?.longitude,
      destino?.latitude,
      destino?.longitude,
    ],
    queryFn: () =>
      geoApi.getRoutePreview({
        origem: origemParaRota as Coordenada,
        destino: destino as Coordenada,
      }),
    enabled: Boolean(origemParaRota && destino),
    retry: false,
    staleTime: 60 * 1000,
  });

  const route: TracedRoutePoint[] | null = query.data
    ? query.data.geometria.coordinates.map(([longitude, latitude]) => ({ latitude, longitude }))
    : null;

  return {
    route,
    distanciaMetros: query.data?.distanciaMetros ?? null,
    duracaoSegundos: query.data?.duracaoSegundos ?? null,
    isLoading: query.isFetching,
  };
}

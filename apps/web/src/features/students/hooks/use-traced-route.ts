"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import type { Coordenada } from "@rotta/api-client";

import { geoApi } from "@/lib/api-client";

const DEBOUNCE_MS = 600;

export interface TracedRoutePoint {
  latitude: number;
  longitude: number;
}

/**
 * Geocodifica o endereço de embarque (texto livre montado a partir do
 * formulário) e traça a rota até o destino (a escola escolhida) —
 * pedido do usuário em produção: "clicando na escola correspondente
 * ela já aparece no mapa (com um pino), onde ali ele vai ver a rota
 * traçada". Usa o Rotta Geo Engine (`/geo/geocode` + `/geo/rota-previa`,
 * Nominatim/OSRM só do lado do servidor — nunca chamados direto do
 * navegador, mesma regra de `@rotta/maps`).
 *
 * `endereco` só chega pronto (CEP+logradouro+número+bairro+cidade+UF
 * concatenados) depois que os campos obrigatórios do embarque foram
 * preenchidos — `null` antes disso desativa a busca (nunca geocodifica
 * endereço incompleto). Debounce de 600ms local (sem lib nova) evita
 * chamar o Nominatim a cada tecla digitada.
 */
export function useTracedRoute(
  endereco: string | null,
  destino: Coordenada | null,
): {
  origem: Coordenada | null;
  route: TracedRoutePoint[] | null;
  distanciaMetros: number | null;
  duracaoSegundos: number | null;
  isGeocoding: boolean;
  isRouting: boolean;
  geocodeFailed: boolean;
  routeFailed: boolean;
} {
  const [enderecoDebounced, setEnderecoDebounced] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setEnderecoDebounced(endereco), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [endereco]);

  const geocodeQuery = useQuery({
    queryKey: ["geo", "geocode", enderecoDebounced],
    queryFn: () => geoApi.geocodeAddress(enderecoDebounced as string),
    enabled: Boolean(enderecoDebounced),
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const origem = geocodeQuery.data ?? null;

  const routeQuery = useQuery({
    queryKey: [
      "geo",
      "rota-previa",
      origem?.latitude,
      origem?.longitude,
      destino?.latitude,
      destino?.longitude,
    ],
    queryFn: () =>
      geoApi.getRoutePreview({
        origem: { latitude: origem!.latitude, longitude: origem!.longitude },
        destino: destino!,
      }),
    enabled: Boolean(origem && destino),
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const route: TracedRoutePoint[] | null = routeQuery.data
    ? routeQuery.data.geometria.coordinates.map(([longitude, latitude]) => ({
        latitude,
        longitude,
      }))
    : null;

  return {
    origem,
    route,
    distanciaMetros: routeQuery.data?.distanciaMetros ?? null,
    duracaoSegundos: routeQuery.data?.duracaoSegundos ?? null,
    isGeocoding: geocodeQuery.isFetching,
    isRouting: routeQuery.isFetching,
    geocodeFailed: geocodeQuery.isError,
    routeFailed: routeQuery.isError,
  };
}

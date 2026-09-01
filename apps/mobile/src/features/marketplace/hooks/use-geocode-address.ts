import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { geoApi } from "@/lib/api-client";

const DEBOUNCE_MS = 600;

export interface GeocodedCoordinate {
  latitude: number;
  longitude: number;
}

/**
 * Geocodifica um endereço em texto livre (CEP+logradouro+número+bairro+
 * cidade+UF concatenados) — mesmo `POST /geo/geocode` (Rotta Geo Engine,
 * Nominatim só do lado do servidor) que `use-traced-route.ts` já usa no
 * Painel Web para o cadastro de aluno. Gap real corrigido aqui: a tela
 * "Solicitar Transporte" do app nunca geocodificava o endereço do aluno
 * novo — `embarqueLatitude`/`Longitude` ficavam sempre vazios pra quem
 * cadastra pelo celular, e sem coordenada o aluno nunca aparece nas
 * paradas do motorista (filtrado de propósito pela rede de segurança
 * "Null Island", ver `TripsService`).
 *
 * Sem mapa/rota traçada aqui (essa tela não tem mapa) — só a coordenada,
 * o suficiente pra `RouteStop`/pendências do motorista funcionarem de
 * verdade. `endereco` só chega pronto depois que os campos obrigatórios
 * do formulário foram preenchidos — `null` antes disso desativa a busca.
 * Nunca bloqueia o cadastro se a geocodificação ainda não terminou ou
 * falhou: o formulário segue enviável, só sem as coordenadas.
 */
export function useGeocodeAddress(endereco: string | null): {
  coordenada: GeocodedCoordinate | null;
  isGeocoding: boolean;
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

  return {
    coordenada: geocodeQuery.data
      ? { latitude: geocodeQuery.data.latitude, longitude: geocodeQuery.data.longitude }
      : null,
    isGeocoding: geocodeQuery.isFetching,
  };
}

/**
 * Contratos do Rotta Geo Engine (briefing "ROTTA GEO PLATFORM" —
 * "Nenhum módulo poderá acessar diretamente o Mapbox. Todos deverão
 * utilizar exclusivamente o Rotta Geo Engine."). Formas estáveis que
 * NÃO vazam a forma bruta da resposta do Mapbox para o resto do
 * sistema — se o provedor mudar um dia, só `GeoEngineService` muda.
 */

export interface GeocodeResult {
  latitude: number;
  longitude: number;
  /** Texto livre do provedor (ex. `relevance` do Mapbox, 0 a 1) — ver nota em `SchoolCoordinate.precisao`. */
  precisao: string;
  enderecoFormatado: string;
  /** Componentes do endereço, quando o provedor os devolve (briefing "ROTTA AI" — "corrigir endereços"). */
  logradouro: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
}

export interface Coordenada {
  latitude: number;
  longitude: number;
}

export interface ReverseGeocodeResult {
  cidade: string | null;
  estado: string | null;
  enderecoFormatado: string;
}

export interface DirectionsResult {
  distanciaMetros: number;
  duracaoSegundos: number;
  /** GeoJSON `LineString` do percurso — usado para desenhar a rota no mapa. */
  geometria: unknown;
}

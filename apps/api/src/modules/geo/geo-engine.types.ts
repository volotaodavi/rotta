/**
 * Contratos do Rotta Geo Engine (briefing "ROTTA GEO PLATFORM" —
 * "Nenhum módulo poderá acessar diretamente o [provedor de mapas].
 * Todos deverão utilizar exclusivamente o Rotta Geo Engine."). Formas
 * estáveis que NÃO vazam a forma bruta da resposta do provedor
 * (Nominatim/OSRM, antes Mapbox) para o resto do sistema — se o
 * provedor mudar um dia, só `GeoEngineService` muda.
 */

export interface GeocodeResult {
  latitude: number;
  longitude: number;
  /** Texto livre do provedor (ex. `importance` do Nominatim, 0 a 1) — ver nota em `SchoolCoordinate.precisao`. */
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

/** Um trecho entre dois pontos consecutivos passados a `getRoute` (origem→parada1, parada1→parada2, ..., →destino). */
export interface DirectionsLeg {
  distanciaMetros: number;
  duracaoSegundos: number;
}

export interface DirectionsResult {
  distanciaMetros: number;
  duracaoSegundos: number;
  /** GeoJSON `LineString` do percurso — usado para desenhar a rota no mapa. */
  geometria: unknown;
  /**
   * Uma perna por trecho, na mesma ordem dos pontos informados —
   * `pernas.length === pontos.length - 1`. Usado por
   * `TripsService.recalcularProximasEtas` (tarefa #99) para acumular o
   * ETA até cada parada pendente, não só o total da viagem.
   */
  pernas: DirectionsLeg[];
}

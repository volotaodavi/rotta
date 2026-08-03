const EARTH_RADIUS_KM = 6371;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Distância em linha reta entre duas coordenadas (fórmula de Haversine)
 * — usada pela busca de transportadores (briefing "Marketplace" §"MAPA").
 * Calculada na camada de aplicação sobre o conjunto já filtrado por
 * status/RLS — aceitável para o volume esperado de Empresas ativas
 * hoje. PostGIS já foi habilitado (Map Intelligence Agent, módulo Geo
 * Platform — ver `School.pontoGeografico`/`SchoolMarkerRepository`),
 * mas migrar esta busca de transportadores para `ST_DWithin`/índice
 * espacial é um trabalho à parte (schema de `Company`, não de `School`)
 * — nenhuma mudança na assinatura pública deste util quando isso acontecer.
 */
export function haversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

const EARTH_RADIUS_KM = 6371;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Distância em linha reta entre duas coordenadas (fórmula de Haversine)
 * — movida de `modules/marketplace/geo.util.ts` (Dossiê 39/40: passou a
 * ter um segundo consumidor, `TripsService`/geofencing, então virou
 * utilitário compartilhado em vez de específico do Marketplace — mesma
 * função, nenhuma mudança de comportamento). PostGIS já foi habilitado
 * (Map Intelligence Agent, módulo Geo Platform — ver
 * `School.pontoGeografico`/`SchoolMarkerRepository`), mas migrar estes
 * consumidores para `ST_DWithin`/índice espacial é um trabalho à parte.
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

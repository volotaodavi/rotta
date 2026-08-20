/**
 * Distância em linha reta entre duas coordenadas (fórmula de Haversine)
 * — mesma fórmula/constantes de `apps/api/src/shared/utils/geo.util.ts`
 * (`haversineDistanceKm`), duplicada aqui de propósito: aquele util roda
 * só no servidor (geofencing de notificação, 400m) e não é importável
 * pelo cliente (web/mobile não têm acesso ao código de `apps/api`). Este
 * é o único cálculo de distância feito NO CLIENTE em toda a Rotta — usado
 * exclusivamente para habilitar/desabilitar os botões "Embarque"/
 * "Desembarque" quando o motorista está a até 1km da parada (pedido do
 * usuário, Frente 2: "ao chegar próximo — um raio de até 1km — poderá
 * embarcar o aluno daquela localidade"). Puramente uma trava de UX no
 * aparelho; o backend segue sendo a única fonte de verdade (não valida
 * distância ao criar o `TripStudentEvent` hoje — ver
 * `TripsService.addStudentEvent`).
 */

const EARTH_RADIUS_M = 6_371_000;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export interface DistanceCoordenada {
  latitude: number;
  longitude: number;
}

/** Distância em METROS entre `a` e `b` (fórmula de Haversine). */
export function haversineDistanceMeters(a: DistanceCoordenada, b: DistanceCoordenada): number {
  const dLat = toRadians(b.latitude - a.latitude);
  const dLon = toRadians(b.longitude - a.longitude);
  const sa =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(a.latitude)) * Math.cos(toRadians(b.latitude)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(sa), Math.sqrt(1 - sa));
  return EARTH_RADIUS_M * c;
}

/** Raio de proximidade (pedido explícito do usuário: "um raio de até 1km"). */
export const PROXIMIDADE_EMBARQUE_METROS = 1000;

/** `true` quando `origem` está a `PROXIMIDADE_EMBARQUE_METROS` ou menos de `destino` (ou quando `origem` é `null` — sem posição conhecida, nunca bloqueia por padrão). */
export function estaProximo(
  origem: DistanceCoordenada | null | undefined,
  destino: DistanceCoordenada,
  raioMetros: number = PROXIMIDADE_EMBARQUE_METROS,
): boolean {
  if (!origem) return true;
  return haversineDistanceMeters(origem, destino) <= raioMetros;
}

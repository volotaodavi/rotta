import * as TaskManager from "expo-task-manager";

import type * as Location from "expo-location";

import { tripsApi } from "@/lib/api-client";

/**
 * Item 4 do pedido do usuário: "GPS continuar rodando de verdade em
 * segundo plano no app" — antes, `useTripGpsReporting` só usava
 * `watchPositionAsync` (documentado no próprio código como "rastreamento
 * em PRIMEIRO PLANO apenas... registrado como próximo passo, não fingido
 * aqui"): o SO suspende esse watch assim que o app vai pra segundo
 * plano, então o motorista via o próprio ponto no mapa "sumir"/atrasar
 * ~15-20s toda vez que o telefone bloqueava ou trocava de app — exatamente
 * o sintoma relatado.
 *
 * `TaskManager.defineTask` PRECISA ser chamado no escopo do módulo (fora
 * de qualquer componente/hook) — é o próprio SO que reinicia o processo
 * JS em segundo plano pra entregar cada lote de posições; se a task não
 * estiver definida antes desse import rodar, o SO não tem o que chamar.
 * Por isso o `tripId` ativo não pode vir de `useState`/prop — mora numa
 * variável de módulo (`activeTripId`), que `useTripGpsReporting` atualiza
 * a cada início/fim de viagem.
 */
export const BACKGROUND_TRIP_LOCATION_TASK = "rotta-background-trip-location";

let activeTripId: string | null = null;

export function setActiveTripId(tripId: string | null): void {
  activeTripId = tripId;
}

TaskManager.defineTask(BACKGROUND_TRIP_LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    // Erro do próprio SO entregando a task (ex.: permissão revogada
    // enquanto em segundo plano) — nada a fazer além de descartar este
    // lote; a próxima chamada tenta de novo naturalmente.
    return;
  }
  if (!activeTripId) {
    // Viagem já foi finalizada/pausada desde a última vez que o processo
    // rodou — `stopLocationUpdatesAsync` já deveria ter sido chamado,
    // mas o SO pode entregar um lote em trânsito; nunca reporta pra uma
    // viagem que não é mais a ativa.
    return;
  }

  const { locations } = (data ?? {}) as { locations?: Location.LocationObject[] };
  if (!locations || locations.length === 0) return;

  const tripId = activeTripId;
  await Promise.allSettled(
    locations.map((position) =>
      tripsApi.ingestPosition(tripId, {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        precisaoMetros: position.coords.accuracy ?? undefined,
        velocidadeKmh:
          position.coords.speed !== null ? Math.max(position.coords.speed * 3.6, 0) : undefined,
        capturadaEm: new Date(position.timestamp).toISOString(),
      }),
    ),
  );
  // `Promise.allSettled` nunca rejeita — falha isolada de rede/servidor
  // (comum em segundo plano, rádio suspensa) nunca derruba a task nem
  // as próximas entregas; o próximo lote tenta de novo naturalmente.
});

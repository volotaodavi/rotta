import * as TaskManager from "expo-task-manager";

import type * as Location from "expo-location";

import { drenar, enfileirar } from "@/features/driver/fila-gps/fila-gps";

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

/**
 * Qual viagem este aparelho está rastreando agora, ou `null`.
 *
 * Usado por `RN-AUTH-05` (confirmar antes de sair com viagem em
 * andamento). É o sinal mais direto que existe: só é preenchido
 * enquanto o rastreamento está de pé, e zerado assim que para — sem
 * rede, sem cache, sem depender de qual tela a pessoa visitou.
 */
export function getActiveTripId(): string | null {
  return activeTripId;
}

// `defineTask` roda no escopo do módulo, importado incondicionalmente
// em `index.ts` — bem antes de `AppErrorBoundary` existir (achado
// 14/09/2026, mesma investigação de `@/config/env.ts`). Se lançar (ex.:
// módulo nativo `expo-task-manager` não linkado corretamente num build
// específico), o processo inteiro trava com tela branca pra sempre,
// sem chance de recuperação. `try/catch` aqui é defesa em profundidade:
// se o registro falhar, o app perde só o rastreamento de GPS em
// segundo plano (already-known trade-off, mesmo que o em primeiro
// plano de `useTripGpsReporting` continue funcionando), em vez de
// travar pra TODO papel de usuário, não só Motorista/Monitor.
try {
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

    // `GPS-04`/`GPS-05` — ENFILEIRA SEMPRE, depois drena.
    //
    // Antes de 19/09/2026 este trecho chamava `ingestPosition` direto e
    // engolia a falha com `Promise.allSettled`, sob o comentário de que
    // "o próximo lote tenta de novo naturalmente" — mas não havia lote
    // nenhum: cada posição era enviada uma única vez, e o que falhava
    // sumia. Túnel, viaduto e zona rural apagavam aquele trecho do
    // histórico para sempre, e o histórico é o que prova para a família
    // onde o veículo esteve.
    //
    // Gravar primeiro e enviar depois é o que torna a perda impossível:
    // a escrita local não depende de rede.
    for (const position of locations) {
      await enfileirar({
        tripId,
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        precisaoMetros: position.coords.accuracy ?? undefined,
        velocidadeKmh:
          position.coords.speed !== null ? Math.max(position.coords.speed * 3.6, 0) : undefined,
        capturadaEm: new Date(position.timestamp).toISOString(),
      });
    }

    // Drena o que der. Com rede, a fila esvazia no mesmo ciclo e o
    // comportamento é indistinguível do anterior. Sem rede, `drenar`
    // apenas não apaga nada — e o acúmulo sai na primeira entrega que
    // o SO fizer depois do sinal voltar (`GPS-05`).
    //
    // `catch` mudo de propósito: a task de GPS nunca pode morrer por
    // causa da drenagem. O que importa — a posição — já está gravado.
    try {
      await drenar();
    } catch {
      // Próxima entrega tenta de novo.
    }
  });
} catch (error) {
  // eslint-disable-next-line no-console
  console.error(
    "[background-trip-location-task] Falha ao registrar a task — GPS em segundo plano ficará indisponível, mas o resto do app continua.",
    error,
  );
}

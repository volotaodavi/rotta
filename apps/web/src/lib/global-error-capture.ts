"use client";

import { reportClientError } from "./report-client-error";
import { isServiceWorkerActive } from "./service-worker-status";

const STORAGE_KEY = "rotta_last_raw_client_error";
/** Só mostra o diagnóstico bruto se ele foi capturado há pouco — evita
 * exibir, numa tela sem nenhuma relação, um erro de minutos atrás que
 * ficou esquecido no `sessionStorage`. */
const FRESHNESS_WINDOW_MS = 15_000;

interface RawClientError {
  message: string;
  stack?: string;
  name?: string;
  source: "window-error" | "unhandledrejection";
  capturedAt: number;
}

/**
 * ACHADO REAL (pedido explícito do usuário — fundador testando em
 * produção — depois de duas rodadas de fix que não resolveram o
 * "Server Components render" recorrente em `/rotas/[id]`): o `error.tsx`
 * do Next SÓ recebe a mensagem já REDIGIDA em produção quando a exceção
 * é capturada pelo próprio Error Boundary do React (render/lifecycle) —
 * mas uma Promise rejeitada sem `.catch()` (`unhandledrejection`) ou um
 * erro assíncrono fora do ciclo de render do React (`window.onerror`)
 * NUNCA passa por um Error Boundary — o React não tem como interceptar
 * essas duas categorias, então o Next as trata como "falha genérica" e
 * mostra a mesma tela redigida, sem stack, sem digest de verdade.
 *
 * Este módulo escuta os dois eventos GLOBAIS do navegador — que sempre
 * recebem o `Error`/motivo de rejeição ORIGINAL, nunca redigido, porque
 * disparam direto no cliente, sem passar pelo mecanismo de
 * SSR-para-cliente do Next — e grava o mais recente no
 * `sessionStorage`. `error.tsx` (ambos os apps) lê esse registro: se
 * ele for FRESCO (capturado há poucos segundos, ou seja, quase certo
 * que é a MESMA falha que acabou de acender a tela de erro), mostra o
 * conteúdo bruto real na própria página — nunca escondido atrás de um
 * dashboard externo.
 */
export function initGlobalErrorCapture(): void {
  if (typeof window === "undefined") return;

  window.addEventListener("error", (event: ErrorEvent) => {
    const error = event.error instanceof Error ? event.error : new Error(String(event.message));
    persistAndReport(error, "window-error");
  });

  window.addEventListener("unhandledrejection", (event: PromiseRejectionEvent) => {
    const reason = event.reason;
    const error =
      reason instanceof Error
        ? reason
        : new Error(typeof reason === "string" ? reason : JSON.stringify(reason));
    persistAndReport(error, "unhandledrejection");
  });
}

function persistAndReport(error: Error, source: RawClientError["source"]): void {
  const raw: RawClientError = {
    message: error.message || "Erro sem mensagem",
    stack: error.stack,
    name: error.name,
    source,
    capturedAt: Date.now(),
  };
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(raw));
  } catch {
    // sessionStorage indisponível (modo privado, quota) — só perde o
    // diagnóstico na tela, o report ao backend abaixo ainda funciona.
  }
  reportClientError("WEB", error, {
    source,
    serviceWorkerActive: isServiceWorkerActive(),
  });
}

/** Lido pelas telas de erro (`error.tsx`) pra mostrar o diagnóstico bruto
 * — `undefined` se nada foi capturado recentemente. */
export function readRecentRawClientError(): RawClientError | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as RawClientError;
    if (Date.now() - parsed.capturedAt > FRESHNESS_WINDOW_MS) return undefined;
    return parsed;
  } catch {
    return undefined;
  }
}

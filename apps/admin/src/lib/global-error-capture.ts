"use client";

import { reportClientError } from "./report-client-error";

const STORAGE_KEY = "rotta_last_raw_client_error";
/** Só mostra o diagnóstico bruto se ele foi capturado há pouco — evita
 * exibir, numa tela sem nenhuma relação, um erro de minutos atrás que
 * ficou esquecido no `sessionStorage`. */
const FRESHNESS_WINDOW_MS = 15_000;

interface RawClientError {
  message: string;
  stack?: string;
  name?: string;
  source: "window.error" | "unhandledrejection";
  capturedAt: number;
}

/**
 * Réplica de `apps/web/src/lib/global-error-capture.ts` (mesmo achado,
 * mesma investigação do "algo deu errado" recorrente — agora confirmado
 * acontecendo também no Admin Rotta, não só em `apps/web`): o `error.tsx`
 * do Next só recebe a mensagem já REDIGIDA em produção quando a exceção
 * é capturada pelo próprio Error Boundary do React — mas uma Promise
 * rejeitada sem `.catch()` ou um erro assíncrono fora do render NUNCA
 * passa por um Error Boundary, então o Next mostra a mesma tela
 * genérica, sem stack, sem digest de verdade.
 *
 * Escuta os dois eventos GLOBAIS do navegador — que sempre recebem o
 * Error/motivo original, nunca redigido — e grava o mais recente no
 * `sessionStorage`. `error.tsx` (ambos os boundaries deste app) lê esse
 * registro: se for FRESCO, mostra o diagnóstico bruto direto na tela.
 */
export function initGlobalErrorCapture(): void {
  if (typeof window === "undefined") return;

  window.addEventListener("error", (event: ErrorEvent) => {
    const error = event.error instanceof Error ? event.error : new Error(String(event.message));
    persistAndReport(error, "window.error");
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
    // sessionStorage indisponível — só perde o diagnóstico na tela, o
    // report ao backend abaixo ainda funciona.
  }
  reportClientError("ADMIN", error);
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

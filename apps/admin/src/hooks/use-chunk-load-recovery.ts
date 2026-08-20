"use client";

import { useEffect, useState } from "react";

import { isChunkLoadError } from "@/lib/chunk-load-error";

const RELOAD_GUARD_KEY = "rotta_chunk_reload_at";
/** Nunca recarrega mais de uma vez a cada 10s — evita loop infinito se o
 * reload não resolver de verdade (ex.: CDN realmente fora do ar). */
const RELOAD_GUARD_WINDOW_MS = 10_000;

/**
 * Recuperação automática de `ChunkLoadError` (ver `@/lib/chunk-load-error.ts`
 * pro "porquê" completo, mesmo achado replicado de `apps/web`): o
 * navegador tinha em memória as referências de chunk de um deploy
 * ANTERIOR, e uma página nunca visitada antes na sessão tentava buscar
 * um chunk que já não existe mais no deploy atual. Recarregar a página
 * inteira resolve sozinho — busca o HTML novo, com as referências
 * corretas.
 *
 * Retorna `true` enquanto está recarregando (pra a tela mostrar uma
 * mensagem neutra em vez do aviso de erro genérico).
 */
export function useChunkLoadRecovery(error: Error & { digest?: string }): boolean {
  const [isRecovering, setIsRecovering] = useState(false);

  useEffect(() => {
    if (!isChunkLoadError(error)) return;
    if (typeof window === "undefined") return;

    const lastReloadAt = Number(window.sessionStorage.getItem(RELOAD_GUARD_KEY) ?? "0");
    const now = Date.now();
    if (now - lastReloadAt < RELOAD_GUARD_WINDOW_MS) {
      return;
    }

    window.sessionStorage.setItem(RELOAD_GUARD_KEY, String(now));
    setIsRecovering(true);
    window.location.reload();
  }, [error]);

  return isRecovering;
}

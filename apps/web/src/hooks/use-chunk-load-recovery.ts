"use client";

import { useEffect, useState } from "react";

import { isRecoverableStaleBundleError } from "@/lib/chunk-load-error";

const RELOAD_GUARD_KEY = "rotta_chunk_reload_at";
/** Nunca recarrega mais de uma vez a cada 10s — evita loop infinito se o
 * reload não resolver de verdade (ex.: CDN realmente fora do ar). */
const RELOAD_GUARD_WINDOW_MS = 10_000;

/**
 * Recuperação automática de bundle desatualizado no navegador — cobre
 * tanto `ChunkLoadError` quanto a variante que o próprio Next.js absorve
 * e devolve como a mensagem genérica de "Server Components render" sem
 * `digest` (ver `isRecoverableStaleBundleError` em
 * `@/lib/chunk-load-error.ts` pro "porquê" completo de cada padrão — a
 * segunda foi adicionada depois de 21 ocorrências reais confirmadas na
 * tela "Erros do cliente" do Admin Rotta, todas com essa mesma
 * assinatura). Em ambos os casos, o navegador tinha em memória algo de
 * um deploy ANTERIOR, e a página nunca visitada antes na sessão (ex.:
 * `/rotas/[id]` da rota recém-criada) tentava usar uma referência que já
 * não existe mais no deploy atual. Recarregar a página inteira resolve
 * sozinho — busca tudo de novo, sem depender de nada obsoleto na aba.
 *
 * Retorna `true` enquanto está recarregando (pra a tela mostrar uma
 * mensagem neutra em vez do aviso de erro genérico, que nem chega a
 * fazer sentido pro usuário aqui).
 */
export function useChunkLoadRecovery(error: Error & { digest?: string }): boolean {
  const [isRecovering, setIsRecovering] = useState(false);

  useEffect(() => {
    if (!isRecoverableStaleBundleError(error)) return;
    if (typeof window === "undefined") return;

    const lastReloadAt = Number(window.sessionStorage.getItem(RELOAD_GUARD_KEY) ?? "0");
    const now = Date.now();
    if (now - lastReloadAt < RELOAD_GUARD_WINDOW_MS) {
      // Já tentou recarregar recentemente e o erro persiste — não é mais
      // um chunk desatualizado pontual, deixa a tela normal de erro
      // aparecer (com o botão "Tentar novamente" manual).
      return;
    }

    window.sessionStorage.setItem(RELOAD_GUARD_KEY, String(now));
    setIsRecovering(true);
    window.location.reload();
  }, [error]);

  return isRecovering;
}

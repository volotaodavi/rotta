"use client";

import { useEffect } from "react";

import { extractBuildIdFromHtml, getOwnBuildId } from "@/lib/build-id";

const RELOAD_GUARD_KEY = "rotta_stale_build_reload_at";
/** Mesma janela de proteção contra loop já usada em `use-chunk-load-recovery.ts`. */
const RELOAD_GUARD_WINDOW_MS = 10_000;

/**
 * ACHADO REAL (investigação de 21 ocorrências reais em produção do
 * "Server Components render" sem `digest`, sempre segundos depois de
 * criar/abrir uma rota — ver a nota completa em
 * `apps/web/src/lib/chunk-load-error.ts` e `ClientErrorReport`,
 * schema.prisma). Os fixes anteriores (`ServiceWorkerRegistration`,
 * `useChunkLoadRecovery`) só agem DEPOIS que o erro já apareceu — este
 * componente tenta evitar que ele apareça: logo depois que o painel
 * termina de carregar, busca o HTML da própria página de novo
 * (`cache: "no-store"`, sempre rede, nunca cache) e compara o
 * `rotta-build-id` dessa resposta fresca contra o build que o navegador
 * já tem carregado (`NEXT_PUBLIC_BUILD_ID`, embutido no bundle JS). Se
 * forem diferentes, o navegador está rodando um deploy velho — recarrega
 * a página UMA vez (mesma proteção de 10s contra loop de
 * `use-chunk-load-recovery.ts`) antes que a pessoa clique em qualquer
 * coisa que dispare o erro de verdade.
 *
 * Só roda em cima do painel autenticado (`(dashboard)/layout.tsx`) —
 * onde as 21 ocorrências reais aconteceram — não nas páginas de
 * marketing público, que não têm esse histórico e não valem o fetch
 * extra em cada carregamento.
 */
export function StaleBuildWatchdog(): null {
  useEffect(() => {
    const ownBuildId = getOwnBuildId();
    if (!ownBuildId || typeof window === "undefined") return;

    let cancelled = false;

    void (async () => {
      try {
        const response = await fetch(window.location.pathname, {
          cache: "no-store",
          credentials: "omit",
        });
        if (!response.ok || cancelled) return;

        const html = await response.text();
        const currentBuildId = extractBuildIdFromHtml(html);
        if (!currentBuildId || currentBuildId === ownBuildId) return;

        const lastReloadAt = Number(window.sessionStorage.getItem(RELOAD_GUARD_KEY) ?? "0");
        const now = Date.now();
        if (now - lastReloadAt < RELOAD_GUARD_WINDOW_MS) return;

        window.sessionStorage.setItem(RELOAD_GUARD_KEY, String(now));
        window.location.reload();
      } catch {
        // Falha de rede/offline — nunca trava a navegação normal por
        // causa desta checagem preventiva, só perde a checagem desta vez.
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- roda uma vez por carregamento de página (mount), não a cada re-render.
  }, []);

  return null;
}

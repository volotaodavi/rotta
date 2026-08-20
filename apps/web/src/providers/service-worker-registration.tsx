"use client";

import { useEffect } from "react";

const FORCE_RELOAD_GUARD_KEY = "rotta_sw_purge_reload_at";
const FORCE_RELOAD_GUARD_WINDOW_MS = 10_000;

/**
 * ACHADO REAL (investigação do "algo deu errado" recorrente em
 * `/rotas/[id]`, depois de 3 rodadas de fix que não bastaram): todos os
 * relatos reais capturados por `reportClientError` até agora vieram
 * SEMPRE com a mensagem genérica redigida do Next — nunca com a
 * mensagem/stack REAL que `global-error-capture.ts`
 * (`window.onerror`/`unhandledrejection`) deveria ter capturado se a
 * falha fosse assíncrona. Ou seja: a falha É um erro de render de
 * verdade, capturado por um Error Boundary de verdade — mas o Error
 * Boundary que capturou foi o `error.tsx` do Next, NUNCA o boundary
 * novo (`SectionErrorBoundary`) que agora envolve a página inteira e
 * deveria capturar PRIMEIRO, por estar mais próximo da árvore. A única
 * explicação que sobra: o navegador de quem está testando ainda está
 * rodando uma versão ANTIGA do código (de antes de qualquer um destes
 * fixes) — controlada por um Service Worker que nunca foi atualizado
 * pra essa aba, servindo HTML cacheado antigo a cada navegação, não
 * importa quantos deploys novos a gente faça.
 *
 * Correção decisiva: em vez de só registrar um Service Worker novo e
 * TORCER pra ele assumir o controle a tempo (`skipWaiting` +
 * `clients.claim()` não bastaram — Chrome pode demorar a checar o
 * script novo numa aba que nunca fecha), esta versão primeiro
 * DESREGISTRA qualquer Service Worker já ativo e APAGA todo cache dele
 * — eliminando de vez o risco de qualquer HTML antigo continuar sendo
 * servido. Se algo foi removido, força um reload ÚNICO (com guarda de
 * 10s pra nunca entrar em loop) pra essa mesma aba já carregar limpa,
 * sem precisar que a pessoa feche e abra o navegador manualmente.
 *
 * Nenhum Service Worker novo é registrado por enquanto — o ganho de
 * "abrir offline" pras poucas páginas de marketing público não vale o
 * risco de reintroduzir esta mesma classe de bug enquanto o incidente
 * não estiver 100% resolvido e confirmado.
 */
export function ServiceWorkerRegistration(): null {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    void (async () => {
      const registrations = await navigator.serviceWorker.getRegistrations();
      if (registrations.length === 0) return;

      await Promise.all(registrations.map((registration) => registration.unregister()));

      if ("caches" in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map((name) => caches.delete(name)));
      }

      const lastReloadAt = Number(window.sessionStorage.getItem(FORCE_RELOAD_GUARD_KEY) ?? "0");
      const now = Date.now();
      if (now - lastReloadAt < FORCE_RELOAD_GUARD_WINDOW_MS) return;
      window.sessionStorage.setItem(FORCE_RELOAD_GUARD_KEY, String(now));
      window.location.reload();
    })();
  }, []);

  return null;
}

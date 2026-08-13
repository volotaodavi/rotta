"use client";

import { useEffect } from "react";

/** Screen Wake Lock API não está no lib.dom.d.ts padrão do TS em toda versão — tipagem mínima do que este hook de fato usa, sem depender da lib global. */
interface WakeLockSentinelLike {
  release: () => Promise<void>;
}
interface NavigatorWithWakeLock {
  wakeLock?: {
    request: (type: "screen") => Promise<WakeLockSentinelLike>;
  };
}

/**
 * Mantém a tela acesa enquanto `active` for `true` (Frente G, "inove" —
 * ninguém pediu, mas é o problema óbvio de rodar "Minha Rota" no
 * navegador durante uma viagem: o celular apaga a tela sozinho e a
 * página deixa de reportar posição/deixa de mostrar o checklist de
 * embarque até o motorista desbloquear de novo). Só pedido enquanto a
 * viagem está `EM_ANDAMENTO` — nunca fica ligado à toa fora disso,
 * mesmo princípio de `useTripGpsReporting` (GPS só liga com viagem
 * ativa).
 *
 * Melhor esforço, nunca crítico: `navigator.wakeLock` não existe em
 * todo navegador (Safari só a partir de versões recentes) — sem
 * suporte, a página simplesmente não mantém a tela acesa sozinha, sem
 * erro nem aviso pro usuário. O wake lock é liberado automaticamente
 * pelo navegador quando a aba fica em segundo plano; o `visibilitychange`
 * abaixo pede de novo assim que ela volta a ficar visível.
 */
export function useWakeLock(active: boolean): void {
  useEffect(() => {
    if (!active || typeof navigator === "undefined") return;

    const nav = navigator as NavigatorWithWakeLock;
    if (!nav.wakeLock) return;

    let sentinel: WakeLockSentinelLike | null = null;
    let cancelled = false;

    async function requestLock(): Promise<void> {
      try {
        const acquired = await nav.wakeLock!.request("screen");
        if (cancelled) {
          void acquired.release();
          return;
        }
        sentinel = acquired;
      } catch {
        // Bateria fraca, política do navegador, etc. — melhor esforço, nunca bloqueia a viagem.
      }
    }

    function handleVisibilityChange(): void {
      if (document.visibilityState === "visible" && !sentinel) {
        void requestLock();
      }
    }

    void requestLock();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      void sentinel?.release();
    };
  }, [active]);
}

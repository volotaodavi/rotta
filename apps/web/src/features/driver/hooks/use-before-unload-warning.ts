"use client";

import { useEffect } from "react";

/**
 * Avisa antes de fechar/recarregar a aba enquanto `active` — Frente G,
 * "inove": sem isso, um motorista que troca de aba sem querer ou
 * fecha o navegador no meio de uma viagem perde o acompanhamento ao
 * vivo (`useTripGpsReporting`) sem nenhum aviso. O texto customizado do
 * `beforeunload` não aparece em navegador nenhum atual (mensagem
 * genérica do próprio navegador é o que sempre aparece) — a API só
 * decide SE mostra o diálogo, `event.preventDefault()`/`returnValue`
 * é o gatilho, o texto em si é ignorado por especificação.
 */
export function useBeforeUnloadWarning(active: boolean): void {
  useEffect(() => {
    if (!active) return;

    function handleBeforeUnload(event: BeforeUnloadEvent): void {
      event.preventDefault();
      event.returnValue = "";
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [active]);
}

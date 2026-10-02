"use client";

import { useEffect, useState } from "react";

import { extractBuildIdFromHtml, getOwnBuildId } from "@/lib/build-id";

const RELOAD_GUARD_KEY = "rotta_stale_build_reload_at";
/** Mesma janela de proteção contra loop de `use-chunk-load-recovery.ts`. */
const RELOAD_GUARD_WINDOW_MS = 10_000;
/**
 * De quanto em quanto tempo uma aba já aberta pergunta se saiu deploy
 * novo (02/10/2026). Antes a checagem era UMA só, no carregamento da
 * página: uma aba deixada aberta a tarde inteira continuava rodando o
 * código de um deploy antigo para sempre, e a pessoa só via a versão
 * nova se lembrasse de dar F5. É o outro lado do "não atualiza de
 * forma automática": o dado agora se atualiza sozinho
 * (`query-provider.tsx`), e a própria versão do painel também.
 *
 * 5 minutos é um HTML por aba visível a cada 5 minutos, nada perto de
 * qualquer limite, e nunca roda com a aba escondida.
 */
const INTERVALO_DE_CHECAGEM_MS = 5 * 60 * 1000;

/**
 * Espelho de `apps/web/src/providers/stale-build-watchdog.tsx`
 * (02/10/2026), no app que nunca o teve — e o Admin era o pior lugar
 * para não ter: é uma aba que fica aberta o dia inteiro, então era
 * justamente quem mais ficava rodando um deploy antigo sem saber.
 * Guardado pelo teste do app vizinho (`stale-build-watchdog.spec.tsx`,
 * mesmo arquivo, mesmo comportamento); a duplicação segue o que o
 * monorepo já faz com infra de app (`use-cep-lookup`,
 * `use-chunk-load-recovery` existem nos dois).
 *
 * Busca o HTML da própria página de novo (`cache: "no-store"`, sempre
 * rede, nunca cache) e compara o `rotta-build-id` dessa resposta
 * fresca contra o build que o navegador já tem carregado (a `<meta>`
 * que `app/layout.tsx` renderiza). Se forem diferentes, o navegador
 * está rodando um deploy velho.
 *
 * O que acontece quando está velho depende de QUANDO a gente descobre:
 *
 * - Na primeira checagem, logo depois do carregamento: recarrega
 *   sozinho (com proteção de 10s contra loop). A pessoa acabou de
 *   abrir a tela, não tem nada pra perder.
 * - Nas checagens seguintes, com a sessão em andamento: mostra um
 *   aviso com botão. Recarregar à força aqui jogaria fora um
 *   formulário meio preenchido, e aí o conserto seria pior que o
 *   defeito.
 */
export function StaleBuildWatchdog(): JSX.Element | null {
  const [temVersaoNova, setTemVersaoNova] = useState(false);

  useEffect(() => {
    const ownBuildId = getOwnBuildId();
    if (!ownBuildId || typeof window === "undefined") return;

    let cancelado = false;
    let primeiraChecagem = true;
    let achouVersaoNova = false;

    function recarregarUmaVez(): void {
      const ultimoReload = Number(window.sessionStorage.getItem(RELOAD_GUARD_KEY) ?? "0");
      const agora = Date.now();
      if (agora - ultimoReload < RELOAD_GUARD_WINDOW_MS) return;

      window.sessionStorage.setItem(RELOAD_GUARD_KEY, String(agora));
      window.location.reload();
    }

    async function checar(): Promise<void> {
      if (cancelado || achouVersaoNova || document.hidden) return;

      try {
        const response = await fetch(window.location.pathname, {
          cache: "no-store",
          credentials: "omit",
        });
        if (!response.ok || cancelado) return;

        const buildIdServido = extractBuildIdFromHtml(await response.text());
        if (!buildIdServido || buildIdServido === ownBuildId) return;

        if (primeiraChecagem) {
          recarregarUmaVez();
          return;
        }
        achouVersaoNova = true;
        setTemVersaoNova(true);
      } catch {
        // Falha de rede/offline — nunca trava a navegação normal por
        // causa desta checagem preventiva, só perde a checagem desta vez.
      } finally {
        primeiraChecagem = false;
      }
    }

    void checar();
    const intervalo = setInterval(() => void checar(), INTERVALO_DE_CHECAGEM_MS);
    // Voltar pra aba é o momento mais provável de ter saído deploy no
    // meio: checa na hora, em vez de esperar o próximo intervalo.
    const aoVoltarPraAba = (): void => {
      if (!document.hidden) void checar();
    };
    document.addEventListener("visibilitychange", aoVoltarPraAba);

    return () => {
      cancelado = true;
      clearInterval(intervalo);
      document.removeEventListener("visibilitychange", aoVoltarPraAba);
    };
  }, []);

  if (!temVersaoNova) return null;

  return (
    <div
      role="status"
      className="fixed inset-x-0 bottom-0 z-50 flex flex-wrap items-center justify-center gap-3 border-t border-border bg-surface px-4 py-3 shadow-lg"
    >
      <span className="text-sm text-text">
        Saiu uma versão nova do painel. Atualize para continuar com ela.
      </span>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
      >
        Atualizar agora
      </button>
    </div>
  );
}

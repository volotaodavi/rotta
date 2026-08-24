"use client";

const STORAGE_KEY = "rotta_last_render_checkpoint";

interface RenderCheckpoint {
  label: string;
  pathname: string;
  at: number;
}

/**
 * ACHADO REAL — instrumentação criada depois que a 2ª reprodução ao vivo
 * (relatório do usuário, deployment `b9bd3827c8...`) invalidou version
 * skew como causa: mesmo `deploymentId` em cliente/assets/RSC, e ainda
 * assim `/rotas/[id]` falhou de forma DETERMINÍSTICA (2 rotas
 * diferentes, mesma conta autenticada). Duas ferramentas de diagnóstico
 * já existiam (`readRecentRawClientError` pra `window.onerror`/
 * `unhandledrejection`, `SectionErrorBoundary` pra exceções de render
 * dentro da árvore React) — nenhuma das duas capturou nada nas 4
 * ocorrências reais confirmadas (todas com `source: "error-boundary"` e
 * a mensagem genérica do Next, nunca a real). Isso indica um terceiro
 * caso: a falha acontece num ponto que nem `window.onerror` nem um
 * Error Boundary de classe alcançam — o candidato mais provável é uma
 * falha durante a HIDRATAÇÃO do React (reconciliar o HTML do servidor
 * com o primeiro render do cliente), que o próprio React intercepta e
 * repassa pro `error.tsx` mais próximo sem passar pelos dois mecanismos
 * acima.
 *
 * `recordCheckpoint` escreve SÍNCRONO (nunca numa Promise/efeito) —
 * sessionStorage é síncrono e sobrevive mesmo que o resto do render
 * trave um instante depois. Chamado em pontos sucessivos do render de
 * `/rotas/[id]` (início, depois de cada hook, antes do JSX final): se a
 * falha realmente for de hidratação/render, o ÚLTIMO checkpoint escrito
 * antes da tela quebrar aponta exatamente onde parou. `error.tsx` lê e
 * mostra isso na tela E manda no relatório — primeira vez que temos
 * visibilidade real de ONDE, dentro do render desta página, a falha
 * acontece.
 */
export function recordCheckpoint(label: string): void {
  if (typeof window === "undefined") return;
  try {
    const checkpoint: RenderCheckpoint = {
      label,
      pathname: window.location.pathname,
      at: Date.now(),
    };
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(checkpoint));
  } catch {
    // sessionStorage indisponível (modo privado, quota) — instrumentação
    // é best-effort, nunca deve interromper o render de verdade.
  }
}

/** Lido por `error.tsx` — `undefined` se nada foi registrado ainda nesta aba. */
export function readLastCheckpoint(): RenderCheckpoint | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return undefined;
    return JSON.parse(raw) as RenderCheckpoint;
  } catch {
    return undefined;
  }
}

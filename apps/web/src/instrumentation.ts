import type { Instrumentation } from "next";

/**
 * Pedido explícito do usuário (fundador, investigando o "Server
 * Components render" com digest real capturado — `4088390160`, rota
 * `/rotas/bea78911-69ce-4842-9ac9-7088558ee3b8`, 18:47:09): capturar a
 * exceção ORIGINAL no ponto certo. `error.tsx`/`reportClientError` só
 * enxergam o que o Next.js já REDIGIU pro navegador; `onRequestError`
 * roda no SERVIDOR, antes dessa redação acontecer — é o único hook do
 * próprio Next.js pensado pra isso (https://nextjs.org/docs/app/guides/instrumentation#capturing-errors).
 *
 * De propósito: só `console.error`/`console.log` (aparece nos Runtime
 * Logs da Vercel) — nenhuma chamada de rede, nenhuma alteração
 * funcional em nenhuma página, nenhum outro comportamento novo. Nunca
 * registra headers, cookies, tokens, senha ou `Authorization`.
 *
 * `register()` abaixo é TEMPORÁRIO — pedido explícito do usuário pra
 * provar, com uma linha própria e inconfundível nos Runtime Logs
 * (`[ROTTA_INSTRUMENTATION_REGISTERED]`), que este arquivo
 * (`apps/web/src/instrumentation.ts`) realmente foi compilado e
 * carregado pelo runtime do deployment publicado — sem essa prova
 * separada, um "onRequestError nunca disparou" é ambíguo entre "não
 * aconteceu nenhum erro" e "a instrumentação nunca rodou". Remover
 * depois que a causa raiz for confirmada.
 */
export function register(): void {
  // eslint-disable-next-line no-console
  console.log("[ROTTA_INSTRUMENTATION_REGISTERED]", {
    runtime: process.env.NEXT_RUNTIME,
    deployment: process.env.VERCEL_GIT_COMMIT_SHA,
  });
}

export const onRequestError: Instrumentation.onRequestError = (error, request, context) => {
  const err = error as { name?: string; message?: string; digest?: string; stack?: string };
  // `renderType` NÃO existe em `RequestErrorContext` no `.d.ts` realmente
  // instalado desta versão do Next (15.5.22) — só `routerKind, routePath,
  // routeType, renderSource?, revalidateReason` existem lá. Pedido
  // explícito do usuário pra registrar mesmo assim (cast permissivo, sem
  // quebrar o typecheck): se o runtime também não expuser o campo, o
  // valor abaixo sai `undefined` nos logs, o que já é a resposta.
  const renderType = (context as unknown as { renderType?: unknown }).renderType;

  console.error("[ROTTA_SERVER_RENDER_ERROR]", {
    name: err.name,
    message: err.message,
    digest: err.digest,
    stack: err.stack,
    path: request.path,
    method: request.method,
    routePath: context.routePath,
    routeType: context.routeType,
    routerKind: context.routerKind,
    renderSource: context.renderSource,
    renderType,
    deployment: process.env.VERCEL_GIT_COMMIT_SHA,
  });
};

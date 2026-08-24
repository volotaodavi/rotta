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
 * De propósito: só `console.error` (aparece nos Runtime Logs da
 * Vercel) — nenhuma chamada de rede, nenhuma alteração funcional em
 * nenhuma página, nenhum outro comportamento novo. Nunca registra
 * headers, cookies, tokens, senha ou `Authorization`.
 */
export const onRequestError: Instrumentation.onRequestError = (error, request, context) => {
  const err = error as { name?: string; message?: string; digest?: string; stack?: string };

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
    deployment: process.env.VERCEL_GIT_COMMIT_SHA,
  });
};

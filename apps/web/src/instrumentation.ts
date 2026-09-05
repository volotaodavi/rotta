import * as Sentry from "@sentry/nextjs";

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
 * `register()` carrega o init do SDK do Sentry (`@sentry/nextjs`, aponta
 * pro GlitchTip — ver `instrumentation-client.ts`) por runtime — sem
 * isso, `Sentry.captureRequestError` roda sem cliente configurado. O
 * `console.log`/`console.error` seguem aqui também (aparecem nos Runtime
 * Logs da Vercel), com a mesma tag `[ROTTA_SERVER_RENDER_ERROR]` de
 * antes — nenhuma chamada de rede própria, nenhuma alteração funcional em
 * nenhuma página, nenhum registro de headers/cookies/tokens/senha.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
  // eslint-disable-next-line no-console
  console.log("[ROTTA_INSTRUMENTATION_REGISTERED]", {
    runtime: process.env.NEXT_RUNTIME,
    deployment: process.env.VERCEL_GIT_COMMIT_SHA,
  });
}

export const onRequestError: Instrumentation.onRequestError = (error, request, context) => {
  Sentry.captureRequestError(error, request, context);

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

import type { ClientApp, ClientErrorSource } from "@rotta/api-client";

import { clientErrorsApi } from "@/lib/api-client";
import { getOwnBuildId } from "@/lib/build-id";

/**
 * Envia pro backend o erro REAL (mensagem, digest, stack) que um Error
 * Boundary (`error.tsx`) acabou de capturar — antes que o Next.js já
 * tenha redigido a mensagem original na tela mostrada ao usuário. Ver
 * a nota completa do "porquê" em
 * `packages/api-client/src/endpoints/client-errors.ts` e em
 * `ClientErrorReport` (`apps/api/prisma/schema.prisma`): em produção
 * (Vercel), todo erro de "Server Components render" chega ao navegador
 * já com a mensagem trocada por um `digest` opaco — sem isso, a única
 * forma de descobrir o que quebrou de verdade era pedir pro usuário
 * garimpar o dashboard da Vercel manualmente, o que já causou mais de
 * uma rodada inteira de investigação às cegas.
 *
 * Nunca lança: se a própria chamada falhar (rede fora do ar, API
 * indisponível, o próprio erro sendo justamente uma falha de rede), o
 * Error Boundary continua funcionando normalmente pro usuário — só
 * ficamos sem o relatório desta vez. Ver `.catch(() => undefined)`
 * abaixo, e a mesma garantia documentada no endpoint tipado.
 *
 * `extra.source`/`extra.serviceWorkerActive` + `buildId` (calculado
 * aqui, sempre) — três diagnósticos adicionados depois de 21 ocorrências
 * reais do mesmo "Server Components render" sem `digest`: ver a nota
 * completa em `ClientErrorReport` (schema.prisma) e
 * `apps/web/src/lib/chunk-load-error.ts`. Tornam a tela "Erros do
 * cliente" (Admin Rotta) específica o bastante pra provar, sem
 * investigação manual, se um navegador estava rodando um bundle
 * desatualizado no momento do erro.
 */
export function reportClientError(
  app: ClientApp,
  error: Error & { digest?: string },
  extra: { source?: ClientErrorSource; serviceWorkerActive?: boolean } = {},
): void {
  clientErrorsApi
    .report({
      app,
      message: error.message || "Erro sem mensagem",
      digest: error.digest,
      stack: error.stack,
      path: typeof window !== "undefined" ? window.location.pathname : "",
      buildId: getOwnBuildId() ?? undefined,
      serviceWorkerActive: extra.serviceWorkerActive,
      source: extra.source,
    })
    .catch(() => undefined);
}

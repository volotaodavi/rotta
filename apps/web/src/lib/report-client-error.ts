import type { ClientApp } from "@rotta/api-client";

import { clientErrorsApi } from "@/lib/api-client";

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
 */
export function reportClientError(app: ClientApp, error: Error & { digest?: string }): void {
  clientErrorsApi
    .report({
      app,
      message: error.message || "Erro sem mensagem",
      digest: error.digest,
      stack: error.stack,
      path: typeof window !== "undefined" ? window.location.pathname : "",
    })
    .catch(() => undefined);
}

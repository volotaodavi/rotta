/**
 * Init do SDK do Sentry (`@sentry/nextjs`) no navegador — aponta pro
 * GlitchTip (compatível com o mesmo protocolo, mesmo SDK), não pro Sentry
 * SaaS. Existe especificamente pra resolver o impasse documentado em
 * `apps/web/src/app/error.tsx`/`report-client-error.ts`: em produção, o
 * Next.js redige `error.message`/`error.stack` de QUALQUER exceção capturada
 * por um Error Boundary — inclusive as que nascem 100% no navegador, sem
 * nenhuma exceção real no servidor (confirmado: `GET /client-errors`
 * mostra `digest: null` em toda ocorrência do "Server Components render"
 * indeterminístico em `/rotas/[id]` recém-criada, e os Runtime Logs da
 * Vercel — `onRequestError`, `instrumentation.ts` — ficam mudos nelas).
 * `reportClientError`/`SectionErrorBoundary` só enxergam essa versão já
 * redigida. O SDK do Sentry tem integração própria e mais profunda com o
 * App Router (capture de erro de navegação, RSC, hidratação) — pode
 * enxergar informação que nosso próprio código não alcança.
 *
 * DSN não é segredo — é uma URL pública, pensada pra ir embutida no bundle
 * do navegador (documentação oficial do Sentry/GlitchTip). Nada de
 * performance/tracing/replay ligado aqui: só captura de erro, o mínimo
 * necessário pro diagnóstico.
 */
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://2ea4a41894b841939a315e0564008551@app.glitchtip.com/27233",
  tracesSampleRate: 0,
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,
  enabled: process.env.NODE_ENV === "production",
});

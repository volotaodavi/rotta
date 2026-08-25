/**
 * Init do SDK do Sentry (`@sentry/nextjs`) no runtime Edge (middleware,
 * rotas Edge) — mesmo GlitchTip dos outros dois arquivos irmãos, ver a
 * nota completa em `instrumentation-client.ts`.
 */
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://2ea4a41894b841939a315e0564008551@app.glitchtip.com/27233",
  tracesSampleRate: 0,
});

/**
 * Init do SDK do Sentry (`@sentry/nextjs`) no runtime Node do servidor —
 * mesmo GlitchTip do `instrumentation-client.ts` (ver a nota completa lá).
 * Cobertura defensiva: já confirmamos que o "Server Components render"
 * indeterminístico em `/rotas/[id]` NÃO gera nenhuma exceção real do lado
 * do servidor (Runtime Logs mudos), então este arquivo não deve capturar
 * nada relacionado a esse incidente específico — mas cobre qualquer outra
 * falha de servidor real que aconteça, sem custo extra.
 */
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://2ea4a41894b841939a315e0564008551@app.glitchtip.com/27233",
  tracesSampleRate: 0,
});

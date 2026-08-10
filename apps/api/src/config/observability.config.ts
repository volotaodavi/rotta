import { registerAs } from "@nestjs/config";

export interface ObservabilityConfig {
  sentryDsn: string | undefined;
  /** Identifica o ambiente no Sentry (production/staging/…) — separa alertas por ambiente. */
  environment: string;
}

/**
 * Configuração de rastreamento de erros (Dossiê 33 — Prompt 23,
 * observabilidade). `sentryDsn` opcional: sem ele, `ErrorTrackingService`
 * simplesmente não envia nada (mesmo padrão de `didit.config.ts`/
 * `storage.config.ts` — nenhum provedor externo é obrigatório para a
 * aplicação subir).
 */
export default registerAs("observability", (): ObservabilityConfig => ({
  sentryDsn: process.env.SENTRY_DSN || undefined,
  environment: process.env.NODE_ENV ?? "development",
}));

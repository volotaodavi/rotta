import { z } from "zod";

/**
 * Schema de validacao de variaveis de ambiente — Dossie 12, Secao 12.4:
 * "a aplicacao FALHA AO INICIAR (nao silenciosamente em runtime) se uma
 * variavel obrigatoria estiver ausente ou malformada".
 *
 * Usado pelo `ConfigModule.forRoot({ validate })` em `app.module.ts`.
 */
export const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3333),
  API_PREFIX: z.string().min(1).default("v1"),
  CORS_ORIGINS: z.string().min(1),

  DATABASE_URL: z.string().url(),

  REDIS_URL: z.string().url(),

  // QStash (Upstash) — motor de filas serverless que substitui o BullMQ
  // na implantação 100% Vercel (Dossiê 14): sem estas 3 variáveis,
  // `QstashPublisherService` loga um aviso e não publica nada (mesmo
  // padrão "stub honesto" de `FIREBASE_*`/`WHATSAPP_*` abaixo) — a
  // aplicação nunca falha o boot por causa delas. `API_PUBLIC_URL` é a
  // URL pública desta implantação (ex.: a URL do próprio deploy Vercel):
  // o QStash entrega os jobs via HTTP POST de volta para
  // `${API_PUBLIC_URL}/v1/internal/queue/...`, então precisa ser
  // alcançável pela internet, nunca `localhost`.
  QSTASH_TOKEN: z.string().optional(),
  QSTASH_CURRENT_SIGNING_KEY: z.string().optional(),
  QSTASH_NEXT_SIGNING_KEY: z.string().optional(),
  API_PUBLIC_URL: z.string().url().or(z.literal("")).optional(),

  JWT_PRIVATE_KEY: z.string().min(1),
  JWT_PUBLIC_KEY: z.string().min(1),
  JWT_ACCESS_TOKEN_TTL: z.string().default("15m"),
  JWT_REFRESH_TOKEN_TTL: z.string().default("30d"),

  // `.or(z.literal(""))` porque `.env.example` documenta a variavel com
  // valor vazio (nenhum segredo real no repositorio) — string vazia e
  // "nao configurado" aqui, tratado como tal por `SupabaseStorageService`
  // (Dossie 16, upload de logo/foto), nunca como URL invalida.
  SUPABASE_URL: z.string().url().or(z.literal("")).optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  SUPABASE_STORAGE_BUCKET: z.string().default("rotta-documents"),

  // Rotta Geo Engine sobre OpenStreetMap (Nominatim/OSRM) — ao contrário
  // do Mapbox, nenhuma é obrigatória: sem elas, `GeoEngineService` usa as
  // instâncias públicas OSM (`geo.config.ts`), que já funcionam sem
  // nenhum token. Só fazem sentido sobrescrever para apontar a
  // instâncias self-hosted (recomendado em produção de escala nacional).
  NOMINATIM_BASE_URL: z.string().url().or(z.literal("")).optional(),
  NOMINATIM_USER_AGENT: z.string().optional(),
  OSRM_BASE_URL: z.string().url().or(z.literal("")).optional(),

  // Sincronização automática do Education Sync Agent (BullMQ job
  // repetível, coordenado via Redis — nunca dispara em duplicidade
  // mesmo com múltiplas réplicas do `apps/api` em produção, ao
  // contrário de um `@Cron` local). Ambas opcionais: sem
  // `INEP_SYNC_CRON` configurado, a sincronização nacional continua
  // manual (`POST /geo/inep-sync`), nunca falha o boot da aplicação.
  INEP_SYNC_CRON: z.string().optional(),
  INEP_SYNC_ANO: z.string().optional(),

  // Push notification via Firebase Cloud Messaging (briefing "PUSH
  // NOTIFICATION", módulo Communication) — as 3 opcionais: sem elas,
  // `FcmService` recusa o envio com um erro claro em vez de falhar o
  // boot da aplicação (mesmo padrão de `SUPABASE_*` acima).
  FIREBASE_PROJECT_ID: z.string().optional(),
  FIREBASE_CLIENT_EMAIL: z.string().optional(),
  FIREBASE_PRIVATE_KEY: z.string().optional(),

  // Canal WhatsApp (briefing — "arquitetura preparada... camada de
  // abstração para trocar de fornecedor futuramente"). Provedor ativo
  // hoje: Meta Cloud API (`WHATSAPP_PROVIDER` default). Ambas de
  // credencial opcionais: sem elas, `WhatsAppService` recusa o envio com
  // um erro claro, nunca falha o boot.
  WHATSAPP_PROVIDER: z.string().optional(),
  WHATSAPP_ACCESS_TOKEN: z.string().optional(),
  WHATSAPP_PHONE_NUMBER_ID: z.string().optional(),
  WHATSAPP_API_VERSION: z.string().optional(),

  // Canal SMS (briefing — "arquitetura preparada... totalmente
  // desacoplada"). Provedor ativo hoje: Twilio (`SMS_PROVIDER` default).
  // Todas opcionais: sem elas, `SmsService` recusa o envio com um erro
  // claro, nunca falha o boot.
  SMS_PROVIDER: z.string().optional(),
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_FROM_NUMBER: z.string().optional(),

  // Canal E-mail (briefing — "Criar serviço de envio de e-mails,
  // templates HTML responsivos, permitir múltiplos provedores").
  // Provedor ativo hoje: Resend (`EMAIL_PROVIDER` default). Sem
  // EMAIL_API_KEY, `EmailService` recusa o envio com um erro claro,
  // nunca falha o boot.
  EMAIL_PROVIDER: z.string().optional(),
  EMAIL_API_KEY: z.string().optional(),
  EMAIL_FROM_ADDRESS: z.string().optional(),
  EMAIL_FROM_NAME: z.string().optional(),

  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
});

export type Env = z.infer<typeof envSchema>;

/** Funcao de validacao consumida pelo ConfigModule (Nest chama com process.env bruto). */
export function validate(config: Record<string, unknown>): Env {
  const parsed = envSchema.safeParse(config);

  if (!parsed.success) {
    throw new Error(
      `Configuracao de ambiente invalida:\n${parsed.error.issues
        .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
        .join("\n")}`,
    );
  }

  return parsed.data;
}

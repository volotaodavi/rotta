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
  // Complementa CORS_ORIGINS para origens que não dá para listar uma a
  // uma — o caso real é a Vercel: cada Preview Deployment (um por PR)
  // ganha um subdomínio novo (`rotta-web-<hash>-rottabr.vercel.app`),
  // então uma lista fixa nunca cobre todos. Opcional: sem ela, só as
  // origens exatas de CORS_ORIGINS são aceitas (comportamento anterior,
  // inalterado). Ex.: `^https://rotta-(web|admin)-.*-rottabr\.vercel\.app$`.
  CORS_ORIGIN_REGEX: z.string().optional(),

  DATABASE_URL: z.string().url(),
  // Conexao DIRETA (sem pooler), exigida só pelo CLI do Prisma
  // (`migrate deploy`/`migrate dev`) quando `DATABASE_URL` é a conexao
  // em pool da Supabase (PgBouncer, Dossiê 31) — a aplicação em
  // execução (`PrismaService`) nunca lê esta variável, só `DATABASE_URL`;
  // por isso opcional aqui (nunca bloqueia o boot do Nest).
  DIRECT_URL: z.string().url().optional(),

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

  // MFA/2FA por TOTP (Dossiê 43 — previsto desde o Dossiê 12 §4.5).
  // Chave simétrica (32 bytes, base64) usada só por `SecretCipherService`
  // para cifrar/decifrar `User.totpSecretCriptografado` (AES-256-GCM) —
  // precisa ser reversível (decifrar para comparar o código a cada
  // login), por isso não é hasheada como `passwordHash`. Opcional aqui
  // (mesmo padrão "stub honesto" de `SENTRY_DSN`/`LYTEX_*` acima): sem
  // ela, `SecretCipherService` recusa cifrar/decifrar com um erro claro
  // — nunca falha o boot — então o MFA fica indisponível (não quebrado)
  // até a chave ser configurada.
  MFA_ENCRYPTION_KEY: z.string().optional(),

  // `.or(z.literal(""))` porque `.env.example` documenta a variavel com
  // valor vazio (nenhum segredo real no repositorio) — string vazia e
  // "nao configurado" aqui, tratado como tal por `SupabaseStorageService`
  // (Dossie 16, upload de logo/foto), nunca como URL invalida.
  SUPABASE_URL: z.string().url().or(z.literal("")).optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  // Bucket PRIVADO — CNH/documentos de motorista e veículo, foto de aluno
  // (Dossiê 32, RN de segurança): nunca lido por `getPublicUrl`, só por
  // `createSignedUrl` (URL assinada, com token — não adivinhável a partir
  // do id da entidade, ao contrário de uma URL pública previsível).
  SUPABASE_STORAGE_BUCKET: z.string().default("rotta-documents"),
  // Bucket público — só ativos de marca sem dado pessoal sensível (logo
  // e foto do veículo/empresa): `getPublicUrl` continua correto aqui,
  // não há necessidade de assinatura para o que já é intencionalmente
  // público (Dossiê 32).
  SUPABASE_STORAGE_PUBLIC_BUCKET: z.string().default("rotta-public"),

  // Rotta Geo Engine sobre OpenStreetMap (Nominatim/OSRM) — ao contrário
  // do Mapbox, nenhuma é obrigatória: sem elas, `GeoEngineService` usa as
  // instâncias públicas OSM (`geo.config.ts`), que já funcionam sem
  // nenhum token. Só fazem sentido sobrescrever para apontar a
  // instâncias self-hosted (recomendado em produção de escala nacional).
  NOMINATIM_BASE_URL: z.string().url().or(z.literal("")).optional(),
  NOMINATIM_USER_AGENT: z.string().optional(),
  OSRM_BASE_URL: z.string().url().or(z.literal("")).optional(),

  // Rastreamento de erros (Sentry — Dossie 33, Prompt 23). Opcional:
  // sem ela, `ErrorTrackingService` so avisa no boot e nao envia nada.
  SENTRY_DSN: z.string().url().or(z.literal("")).optional(),

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

  // Push real, mobile (Expo) + web (VAPID/RFC 8030) — decisão do
  // usuário: "fazer tudo (móbile + web), porém pegando de forma
  // gratuita". VAPID_* são geradas localmente (`web-push.
  // generateVAPIDKeys()`, sem cadastro em lugar nenhum); sem elas,
  // `WebPushService` recusa o envio com um erro claro. EXPO_ACCESS_TOKEN
  // é só um bônus de rate-limit — o Expo aceita requisições anônimas.
  VAPID_PUBLIC_KEY: z.string().optional(),
  VAPID_PRIVATE_KEY: z.string().optional(),
  VAPID_SUBJECT: z.string().optional(),
  EXPO_ACCESS_TOKEN: z.string().optional(),

  // Cloudflare Turnstile ("não sou um robô", pedido do usuário
  // 01/09/2026) — gratuita. Sem ela, `TurnstileService.assertHuman`
  // pula a verificação (stub honesto), nunca trava o cadastro.
  TURNSTILE_SECRET_KEY: z.string().optional(),

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

  // Suporte (pedido do usuário: "a cada pedido de suporte deverá ser
  // notificado no e-mail da Rotta também"). `SUPPORT_INBOX_EMAIL` é a
  // caixa fixa que recebe uma cópia de todo chamado/mensagem nova — só
  // é usada se `EMAIL_API_KEY` também estiver configurado (mesma
  // dependência de `EmailService`). `ADMIN_APP_URL` é opcional: sem
  // ela, o e-mail só descreve o chamado, sem link clicável pro painel.
  SUPPORT_INBOX_EMAIL: z.string().email().or(z.literal("")).optional(),
  ADMIN_APP_URL: z.string().url().or(z.literal("")).optional(),

  // `WEB_APP_URL` — mesmo raciocínio de `ADMIN_APP_URL` acima, só que
  // pro Painel Web (apps/web): sem ela, `PasswordResetNotifierService`
  // ainda tenta enviar o e-mail de redefinição de senha, mas sem um
  // link clicável (só o token, pra digitar manualmente).
  WEB_APP_URL: z.string().url().or(z.literal("")).optional(),

  // IA de suporte (Gemini, padrão — aistudio.google.com) — responde
  // dúvidas simples de suporte (Frente 5). Trocada de Groq a pedido do
  // usuário 02/09/2026 ("Groq não está indo"); formato Chat Completions
  // da OpenAI, então qualquer provedor compatível (Groq, OpenRouter
  // etc.) funciona só trocando estas 3 vars. Opcional: sem
  // SUPPORT_AI_API_KEY, `SupportAiService` recusa a chamada com um
  // erro claro — o chamado continua sendo criado normalmente, só sem
  // resposta automática (mesmo padrão de DIDIT_API_KEY acima).
  SUPPORT_AI_API_KEY: z.string().optional(),
  SUPPORT_AI_BASE_URL: z.string().url().optional(),
  SUPPORT_AI_MODEL: z.string().optional(),

  // Didit (didit.me) — verificação de identidade (OCR de CNH, Face
  // Match, Liveness) usada por `RottaAiService.validateDocument`
  // (Dossiê 15, tipos CNH/SELFIE/FACE_MATCH/OCR). Opcional: sem
  // DIDIT_API_KEY, `DiditService` recusa a chamada com um erro claro
  // (mesmo padrão de WHATSAPP_*/EMAIL_* acima) — nunca falha o boot,
  // nunca finge um resultado de verificação.
  DIDIT_API_KEY: z.string().optional(),
  DIDIT_BASE_URL: z.string().url().optional(),
  // Segredo do destino de webhook (Business Console → API & Webhooks →
  // Add destination → "secret_shared_key", mostrado só na criação).
  // Opcional: sem ela, `DiditWebhookGuard` recusa toda entrega com um
  // erro claro em vez de aceitar sem verificar assinatura.
  DIDIT_WEBHOOK_SECRET: z.string().optional(),
  // Os DOIS workflows da sessão hospedada (`POST /v3/session/`), usados
  // por `IdentityVerificationModule` — Motorista (CNH apenas) e Monitor/
  // Empresa/Gestor (qualquer documento de identificação), nunca
  // misturados (`resolveDiditWorkflowId`, identity-verification.service.ts).
  // Config, não segredo — Didit docs: "store it in code/config".
  // Opcionais: sem eles, `DiditService` usa os workflows "Motoristas"/
  // "Monitores" já publicados (`didit.config.ts`).
  DIDIT_WORKFLOW_ID_MOTORISTA: z.string().optional(),
  DIDIT_WORKFLOW_ID_MONITOR: z.string().optional(),

  // Lytex (lytex.com.br) — provedora de pagamento parceira da Rotta Pay
  // (Dossiê 26). Opcional: sem LYTEX_CLIENT_ID/LYTEX_CLIENT_SECRET,
  // `RottaPayProviderService` recusa a transferência com um erro claro,
  // nunca falha o boot. `LYTEX_BASE_URL` fica sem default (`.env.example`
  // — o contrato real da API ainda não foi verificado nesta base de
  // código, ver nota em `lytex.config.ts`).
  LYTEX_CLIENT_ID: z.string().optional(),
  LYTEX_CLIENT_SECRET: z.string().optional(),
  LYTEX_BASE_URL: z.string().url().optional(),

  // AbacatePay (abacatepay.com) — provedora que cobra a MENSALIDADE da
  // Rotta das transportadoras/empresas/autônomos (Dossiê 26, R$ 39,90/mês
  // — NUNCA o Responsável, que é 100% gratuito e não tem plano). Ao
  // contrário da Lytex acima, o contrato real da API JÁ foi verificado
  // (docs.abacatepay.com + chamadas reais confirmando a chave). Opcional:
  // sem ABACATEPAY_API_KEY, `AbacatePayClientService` recusa a chamada
  // com um erro claro, nunca falha o boot. ABACATEPAY_WEBHOOK_SECRET é
  // escolhido por nós (não pela AbacatePay) e deve ser o mesmo valor
  // colado no campo "Secret" do webhook criado no dashboard — ver
  // `abacatepay-webhook.controller.ts`.
  ABACATEPAY_API_KEY: z.string().optional(),
  ABACATEPAY_BASE_URL: z.string().url().optional(),
  ABACATEPAY_WEBHOOK_SECRET: z.string().optional(),

  // Asaas (asaas.com) — pedido do usuário: cartão de crédito, débito e
  // boleto da mensalidade da Rotta (Pix continua na AbacatePay acima).
  // Mesmo padrão "stub honesto" da AbacatePay: sem ASAAS_API_KEY,
  // `AsaasClientService` recusa a chamada com um erro claro, nunca
  // derruba o boot. `ASAAS_BASE_URL` tem default de sandbox — troca
  // pra `https://api.asaas.com/v3` em produção (`ASAAS_BASE_URL` real
  // no ambiente). `ASAAS_WEBHOOK_TOKEN` é escolhido por nós (não pela
  // Asaas) e deve ser o mesmo valor colado no cabeçalho `asaas-access-
  // token` configurado no webhook do dashboard — ver
  // `asaas-webhook.guard.ts`. Contrato da API não testado ainda contra
  // uma conta real nesta base de código (mesma ressalva da Lytex).
  ASAAS_API_KEY: z.string().optional(),
  ASAAS_BASE_URL: z.string().url().default("https://api-sandbox.asaas.com/v3"),
  ASAAS_WEBHOOK_TOKEN: z.string().optional(),

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

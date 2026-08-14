import { registerAs } from "@nestjs/config";

import { normalizeApiPublicUrl } from "./api-public-url.util";

export interface DiditConfig {
  apiKey: string | undefined;
  baseUrl: string;
  /** Segredo do destino de webhook (`secret_shared_key`, Business Console → API & Webhooks → Add destination). Ver `didit-webhook.guard.ts`. Setado à mão OU descoberto automaticamente por `DiditWebhookProvisioningService` (nesse caso fica no Redis, não aqui — ver nota lá). */
  webhookSecret: string | undefined;
  /** Workflow da sessão hospedada (`POST /v3/session/`) usada por `DiditService.createVerificationSession`. Config, não segredo — Didit docs: "Get a workflow_id from the console (Workflows)... store it in code/config". */
  workflowId: string;
  /** URL pública desta implantação da API (mesma variável de `qstash.config.ts#apiPublicUrl`) — usada por `DiditWebhookProvisioningService` para montar a URL do destino de webhook (`${apiPublicUrl}/${API_PREFIX}/webhooks/didit`) e registrá-la sozinha na Didit. Sem ela, o auto-registro não roda (nada a montar) — o passo manual (Business Console) continua funcionando normalmente. Passa por `normalizeApiPublicUrl` antes de chegar aqui — bug real de produção encontrado via `didit_webhook_list`: um `/v1` colado a mais na env var virou `/v1/v1/webhooks/didit`, 100% de falha de entrega (ver comentário do util). */
  apiPublicUrl: string | undefined;
}

const DEFAULT_BASE_URL = "https://verification.didit.me";
/** Workflow "Free KYC" da conta Rotta (Business Console → Workflows) — override via `DIDIT_WORKFLOW_ID` só se um novo workflow for publicado. */
const DEFAULT_WORKFLOW_ID = "e7e303a2-4d13-47b5-b777-2692ff0daffd";

/**
 * Configuração da Didit (didit.me) — provedor de verificação de
 * identidade (OCR de documento, Face Match, Liveness) usado por
 * `RottaAiService.validateDocument` para os tipos CNH/SELFIE/FACE_MATCH/
 * OCR (Dossiê 15). `apiKey` opcional: sem ela, `DiditService` recusa a
 * chamada com um erro claro em vez de falhar o boot da aplicação (mesmo
 * padrão de `whatsapp.config.ts`/`email.config.ts`).
 *
 * `baseUrl` aponta para as APIs "standalone" da Didit
 * (https://docs.didit.me/standalone-apis) — chamadas HTTP diretas por
 * verificação (ID Verification/Face Match/Passive Liveness), sem
 * precisar criar sessão/workflow, ideal para o fluxo da Rotta onde o
 * app já fez upload do arquivo para o Supabase Storage e só precisa
 * validar o que já foi enviado.
 *
 * `webhookSecret`: a Didit exige pelo menos um destino de webhook
 * cadastrado para liberar a aplicação no Business Console, mesmo quando
 * o fluxo de verificação usado é o standalone (síncrono, sem sessão) —
 * ver `didit-webhook.guard.ts`/`didit-webhook.controller.ts` para o
 * endpoint real que recebe esses eventos.
 *
 * `workflowId`: identifica o fluxo hospedado da Didit (`verify.didit.me`,
 * captura guiada por ela — ID/Liveness/Face Match num único passo) usado
 * por `IdentityVerificationModule` para Motorista/Empresa-Gestor
 * verificarem a própria identidade (`DiditService.createVerificationSession`)
 * — complementar ao fluxo standalone acima (documento avulso já
 * enviado ao Storage), não um substituto dele.
 */
export default registerAs("didit", (): DiditConfig => ({
  apiKey: process.env.DIDIT_API_KEY || undefined,
  baseUrl: process.env.DIDIT_BASE_URL || DEFAULT_BASE_URL,
  webhookSecret: process.env.DIDIT_WEBHOOK_SECRET || undefined,
  workflowId: process.env.DIDIT_WORKFLOW_ID || DEFAULT_WORKFLOW_ID,
  apiPublicUrl:
    normalizeApiPublicUrl(process.env.API_PUBLIC_URL, process.env.API_PREFIX || "v1") || undefined,
}));

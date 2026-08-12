import { registerAs } from "@nestjs/config";

export interface DiditConfig {
  apiKey: string | undefined;
  baseUrl: string;
  /** Segredo do destino de webhook (`secret_shared_key`, Business Console → API & Webhooks → Add destination). Ver `didit-webhook.guard.ts`. */
  webhookSecret: string | undefined;
  /** Workflow da sessão hospedada (`POST /v3/session/`) usada por `DiditService.createVerificationSession`. Config, não segredo — Didit docs: "Get a workflow_id from the console (Workflows)... store it in code/config". */
  workflowId: string;
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
}));

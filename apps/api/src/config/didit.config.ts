import { registerAs } from "@nestjs/config";

import { normalizeApiPublicUrl } from "./api-public-url.util";

export interface DiditConfig {
  apiKey: string | undefined;
  baseUrl: string;
  /** Segredo do destino de webhook (`secret_shared_key`, Business Console → API & Webhooks → Add destination). Ver `didit-webhook.guard.ts`. Setado à mão OU descoberto automaticamente por `DiditWebhookProvisioningService` (nesse caso fica no Redis, não aqui — ver nota lá). */
  webhookSecret: string | undefined;
  /**
   * Workflow do Motorista (`POST /v3/session/`) — pedido explícito do
   * usuário: "Motorista (APENAS CNH)". Publicado no Business Console
   * como "Motoristas" (OCR restrito a Carteira Nacional de Habilitação
   * de qualquer UF + Liveness, sem Face Match) — conferido campo a
   * campo via `didit_workflow_get_graph` (`documents_allowed` só com
   * `DL.enabled = 1`, todo o resto zerado) antes de fixar este ID como
   * default. Link público equivalente: verify.didit.me/u/jVqJqMr3THqZEg5oKsRUlw.
   */
  workflowIdMotorista: string;
  /**
   * Workflow de todo mundo que NÃO é Motorista (Monitor, Empresa,
   * Gestor) — pedido explícito do usuário: "Monitor (qualquer documento
   * de identificação)". Publicado no Business Console como "Monitores"
   * (OCR com todos os tipos de documento habilitados — CNH/RG/
   * Passaporte/RNE — + Liveness + Face Match), mesma checagem de
   * `documents_allowed` que o de Motorista, mas sem restrição. Link
   * público equivalente: verify.didit.me/u/InuSJv2QRBScZvl4BK4jug.
   *
   * Também usado como default de `resolveDiditWorkflowId` pra qualquer
   * papel além de Motorista — o pedido do usuário só distinguiu essas
   * duas categorias ("cada um baseado no cargo, nada de misturar"),
   * então Empresa/Gestor (que não dirigem por definição do cargo) caem
   * no fluxo mais permissivo em vez de inventar um terceiro workflow
   * sem pedido explícito.
   */
  workflowIdMonitor: string;
  /** URL pública desta implantação da API (mesma variável de `qstash.config.ts#apiPublicUrl`) — usada por `DiditWebhookProvisioningService` para montar a URL do destino de webhook (`${apiPublicUrl}/${API_PREFIX}/webhooks/didit`) e registrá-la sozinha na Didit. Sem ela, o auto-registro não roda (nada a montar) — o passo manual (Business Console) continua funcionando normalmente. Passa por `normalizeApiPublicUrl` antes de chegar aqui — bug real de produção encontrado via `didit_webhook_list`: um `/v1` colado a mais na env var virou `/v1/v1/webhooks/didit`, 100% de falha de entrega (ver comentário do util). */
  apiPublicUrl: string | undefined;
}

const DEFAULT_BASE_URL = "https://verification.didit.me";

/**
 * Defaults reais (Business Console → Workflows, aplicação "My
 * Application" da organização Rotta) — conferidos via `didit_workflow_
 * list`/`didit_workflow_get_graph` (agente Didit) na mesma entrega que
 * fixou este arquivo: ambos `published`, `status: "In Review"` como
 * único destino terminal (nunca auto-aprova/recusa — sempre cai pra
 * decisão manual do Admin Rotta, `IdentityVerificationService.
 * decideForAdmin`). Override via env só se um novo workflow for
 * publicado — `DIDIT_WORKFLOW_ID` (nome antigo, singular) foi
 * REMOVIDO: apontava pro workflow "Free KYC" ARQUIVADO
 * (e7e303a2-4d13-47b5-b777-2692ff0daffd, `is_archived: true`), um bug
 * real de produção — sessões de verificação vinham sendo criadas contra
 * um workflow morto até esta correção.
 */
const DEFAULT_WORKFLOW_ID_MOTORISTA = "393aff88-7da5-4374-839f-0863abc98069";
const DEFAULT_WORKFLOW_ID_MONITOR = "227b9226-fd90-4414-9c66-f97804ae23ba";

/**
 * Configuração da Didit (didit.me) — provedor de verificação de
 * identidade (OCR de documento, Face Match, Liveness) usado por
 * `RottaAiService.validateDocument` para os tipos CNH/SELFIE/FACE_MATCH/
 * OCR (Dossiê 15). `apiKey` opcional: sem ela, `DiditService` recusa a
 * chamada com um erro claro em vez de falhar o boot da aplicação (mesmo
 * padrão de `whatsapp.config.ts`/`email.config.ts`).
 *
 * IMPORTANTE (Render.com): os dois workflows abaixo vivem na aplicação
 * Didit "My Application" (client_id `7YzeyA9pT7A1vq0ldXfInQ`), NÃO na
 * "Rotta (Sandbox)" — `DIDIT_API_KEY` neste ambiente precisa ser a
 * chave de API dessa aplicação especificamente (Business Console →
 * Settings → API & Webhooks → My Application), senão `POST /v3/session/`
 * responde 4xx por workflow_id de uma aplicação diferente da chave.
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
 * `workflowIdMotorista`/`workflowIdMonitor`: identificam os DOIS fluxos
 * hospedados da Didit (`verify.didit.me`, captura guiada por ela) usados
 * por `IdentityVerificationModule` — a escolha de qual workflow abrir é
 * feita por `resolveDiditWorkflowId` (identity-verification.service.ts),
 * a partir do `Role` de quem está verificando, nunca hardcoded num só
 * lugar. Complementar ao fluxo standalone acima (documento avulso já
 * enviado ao Storage), não um substituto dele.
 */
export default registerAs("didit", (): DiditConfig => ({
  apiKey: process.env.DIDIT_API_KEY || undefined,
  baseUrl: process.env.DIDIT_BASE_URL || DEFAULT_BASE_URL,
  webhookSecret: process.env.DIDIT_WEBHOOK_SECRET || undefined,
  workflowIdMotorista: process.env.DIDIT_WORKFLOW_ID_MOTORISTA || DEFAULT_WORKFLOW_ID_MOTORISTA,
  workflowIdMonitor: process.env.DIDIT_WORKFLOW_ID_MONITOR || DEFAULT_WORKFLOW_ID_MONITOR,
  apiPublicUrl:
    normalizeApiPublicUrl(process.env.API_PUBLIC_URL, process.env.API_PREFIX || "v1") || undefined,
}));

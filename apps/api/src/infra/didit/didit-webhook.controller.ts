import { Body, Controller, HttpCode, HttpStatus, Logger, Post, UseGuards } from "@nestjs/common";
import { ApiExcludeController } from "@nestjs/swagger";
import { Prisma, type IdentityVerificationStatus } from "@prisma/client";

import { DiditWebhookGuard } from "./didit-webhook.guard";

import { Public } from "@/common/decorators/public.decorator";
import { PrismaService } from "@/infra/database/prisma.service";


/**
 * Envelope comum a todo webhook da Didit (Business Console → API &
 * Webhooks → destino cadastrado). Só os campos que este controller de
 * fato lê — o corpo completo (com `metadata` etc.) chega intacto em
 * `event`, disponível pra quando um uso real do payload existir.
 */
interface DiditWebhookEnvelope {
  event_id: string;
  webhook_type: string;
  status?: string;
  session_id?: string;
  vendor_data?: string;
  environment?: "live" | "sandbox";
  /** Presente em status "Approved"/"Declined"/"In Review"/"Abandoned". */
  decision?: Record<string, unknown>;
  /** Presente em status "Resubmitted" — substitui `decision`. */
  resubmit_info?: Record<string, unknown>;
}

/**
 * Traduz o `status` literal da Didit (docs.didit.me/integration/
 * verification-statuses) para o enum interno da Rotta — ver comentário
 * de `IdentityVerificationStatus` no schema Prisma para o mapeamento
 * completo. Desconhecido/ausente vira `NAO_INICIADA` (nunca lança —
 * um evento de sessão/status novo que a Didit venha a adicionar não
 * pode derrubar o webhook).
 */
function mapDiditStatus(status: string | undefined): IdentityVerificationStatus {
  switch (status) {
    case "In Progress":
    case "Awaiting User":
    case "Resubmitted":
      return "EM_ANDAMENTO";
    case "In Review":
      return "EM_ANALISE";
    case "Approved":
      return "APROVADA";
    case "Declined":
      return "REPROVADA";
    case "Expired":
    case "Kyc Expired":
      return "EXPIRADA";
    default:
      return "NAO_INICIADA";
  }
}

/**
 * Endpoint que a Didit chama a cada evento do(s) destino(s) cadastrado(s)
 * no Business Console (Settings → API & Webhooks → Add destination →
 * `https://<host>/v1/webhooks/didit`, eventos: no mínimo `status.updated`).
 * A Didit EXIGE pelo menos um destino cadastrado para liberar a
 * aplicação — este controller existe pra satisfazer essa exigência com
 * um endpoint de verdade, assinado de verdade (`DiditWebhookGuard`), não
 * um placeholder.
 *
 * CORRELAÇÃO REAL (desde `IdentityVerificationModule`): `vendor_data` é
 * o `User.id` que `IdentityVerificationService.createSession` passou na
 * criação da sessão — este handler só aplica o evento se `session_id`
 * também bater com `User.identityVerificationSessionId` (nunca deixa
 * uma sessão velha/abandonada sobrescrever o resultado de uma sessão
 * mais nova). Eventos SEM esse par (`DiditService.verifyId`/`faceMatch`/
 * `passiveLiveness`, o fluxo standalone usado por `RottaAiService`, não
 * cria sessão) não têm onde correlacionar — só ficam logados, nunca
 * inventa uma correlação que não existe.
 *
 * Sempre 2xx (mesmo padrão de `AbacatePayWebhookController`): a Didit
 * reentrega em 5xx/404 (até 2 vezes, backoff de ~1min e ~4min) — nunca
 * forçar retry por um evento que já foi aplicado ou que não tem onde
 * persistir.
 */
@ApiExcludeController()
@Controller("webhooks/didit")
@Public()
@UseGuards(DiditWebhookGuard)
export class DiditWebhookController {
  private readonly logger = new Logger(DiditWebhookController.name);

  constructor(private readonly prisma: PrismaService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async handle(@Body() event: DiditWebhookEnvelope): Promise<{ ok: true }> {
    this.logger.log(
      `Webhook Didit recebido: ${event.webhook_type} (event_id=${event.event_id}, status=${event.status ?? "-"}, session_id=${event.session_id ?? "-"}, vendor_data=${event.vendor_data ?? "-"}, environment=${event.environment ?? "-"}).`,
    );

    if (event.vendor_data && event.session_id) {
      await this.applyToIdentityVerification(event);
    } else {
      this.logger.debug(
        "Webhook Didit sem vendor_data/session_id — fora do fluxo de verificação de identidade hospedada, nada a correlacionar.",
      );
    }

    return { ok: true };
  }

  /** Só chamado quando `vendor_data`/`session_id` estão presentes — `updateMany` (não `update`) porque um `id`+`identityVerificationSessionId` que não batem não deve lançar, só ser ignorado. */
  private async applyToIdentityVerification(event: DiditWebhookEnvelope): Promise<void> {
    const status = mapDiditStatus(event.status);
    const decisao = (event.decision ?? event.resubmit_info) as Prisma.InputJsonValue | undefined;

    try {
      const updated = await this.prisma.user.updateMany({
        where: { id: event.vendor_data, identityVerificationSessionId: event.session_id },
        data: {
          identityVerificationStatus: status,
          identityVerifiedAt: status === "APROVADA" ? new Date() : undefined,
          identityVerificationDecisao: decisao,
        },
      });

      if (updated.count === 0) {
        this.logger.warn(
          `Webhook Didit ignorado: session_id=${event.session_id} não é a sessão atual do usuário ${event.vendor_data} (ou usuário não existe) — provável evento de uma sessão já substituída.`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Falha ao aplicar webhook Didit ao usuário ${event.vendor_data}: ${(error as Error).message}`,
      );
    }
  }
}

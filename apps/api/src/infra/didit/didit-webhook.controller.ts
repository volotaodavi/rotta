import { Body, Controller, HttpCode, HttpStatus, Logger, Post, UseGuards } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { ApiExcludeController } from "@nestjs/swagger";
import { NotificationEventType, Prisma } from "@prisma/client";

import {
  DEFAULT_REJECTION_REASON,
  extractDiditDecisionReason,
  mapDiditStatus,
} from "./didit-decision.util";
import { DiditWebhookGuard } from "./didit-webhook.guard";

import { Public } from "@/common/decorators/public.decorator";
import { PrismaService } from "@/infra/database/prisma.service";
import { COMMUNICATION_REQUESTED_EVENT } from "@/modules/notifications/events/communication-requested.event";
import { MessagePersonalizationService } from "@/modules/notifications/message-personalization.service";

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

  constructor(
    private readonly prisma: PrismaService,
    private readonly messagePersonalizationService: MessagePersonalizationService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

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
    const decisionPayload = event.decision ?? event.resubmit_info ?? null;
    const decisao = decisionPayload as Prisma.InputJsonValue | undefined;

    // Motivo só é computado quando este evento de fato trouxe uma
    // decisão (`decisionPayload`) — eventos de progresso puro (ex.
    // "In Progress") não têm nada a extrair e não devem apagar um
    // motivo já registrado por um evento anterior.
    const motivo = decisionPayload
      ? (extractDiditDecisionReason(decisionPayload) ??
        (status === "REPROVADA" ? DEFAULT_REJECTION_REASON : null))
      : undefined;

    try {
      const updated = await this.prisma.user.updateMany({
        where: { id: event.vendor_data, identityVerificationSessionId: event.session_id },
        data: {
          identityVerificationStatus: status,
          identityVerifiedAt: status === "APROVADA" ? new Date() : undefined,
          identityVerificationDecisao: decisao,
          identityVerificationMotivo: motivo,
        },
      });

      if (updated.count === 0) {
        this.logger.warn(
          `Webhook Didit ignorado: session_id=${event.session_id} não é a sessão atual do usuário ${event.vendor_data} (ou usuário não existe) — provável evento de uma sessão já substituída.`,
        );
        return;
      }

      // Só avisa em decisão FINAL (pedido do usuário 31/08/2026: "quero
      // todos" — aprovada e reprovada) — nunca em estado intermediário
      // ("In Progress"/"In Review"), que ainda não é uma decisão de
      // verdade pra comunicar.
      if (status === "APROVADA" || status === "REPROVADA") {
        await this.notifyDecisionBestEffort(event.vendor_data as string, status, motivo);
      }
    } catch (error) {
      this.logger.error(
        `Falha ao aplicar webhook Didit ao usuário ${event.vendor_data}: ${(error as Error).message}`,
      );
    }
  }

  /** Best-effort (nunca derruba o webhook, sempre 2xx pra Didit): busca o nome pra personalizar e emite o evento de comunicação (`CADASTRO_CONCLUIDO`, ver `MessagePersonalizationService`). */
  private async notifyDecisionBestEffort(
    userId: string,
    status: "APROVADA" | "REPROVADA",
    motivo: string | null | undefined,
  ): Promise<void> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { nome: true },
      });
      if (!user) return;

      const mensagem =
        status === "APROVADA"
          ? this.messagePersonalizationService.identidadeAprovada(user.nome)
          : this.messagePersonalizationService.identidadeReprovada(
              user.nome,
              motivo ?? DEFAULT_REJECTION_REASON,
            );

      this.eventEmitter.emit(COMMUNICATION_REQUESTED_EVENT, {
        userId,
        tipo:
          status === "APROVADA"
            ? NotificationEventType.IDENTIDADE_APROVADA
            : NotificationEventType.IDENTIDADE_REPROVADA,
        titulo: mensagem.titulo,
        corpo: mensagem.corpo,
      });
    } catch (error) {
      this.logger.warn(
        `Não foi possível notificar o usuário ${userId} sobre a decisão de verificação de identidade: ${(error as Error).message}`,
      );
    }
  }
}

import { Body, Controller, HttpCode, HttpStatus, Logger, Post, UseGuards } from "@nestjs/common";
import { ApiExcludeController } from "@nestjs/swagger";

import { DiditWebhookGuard } from "./didit-webhook.guard";

import { Public } from "@/common/decorators/public.decorator";

/**
 * Envelope comum a todo webhook da Didit (Business Console → API &
 * Webhooks → destino cadastrado). Só os campos que este controller de
 * fato lê — o corpo completo (com `decision`, `metadata` etc.) chega
 * intacto em `event`, disponível pra quando um uso real do payload
 * existir.
 */
interface DiditWebhookEnvelope {
  event_id: string;
  webhook_type: string;
  status?: string;
  session_id?: string;
  vendor_data?: string;
  environment?: "live" | "sandbox";
}

/**
 * Endpoint que a Didit chama a cada evento do(s) destino(s) cadastrado(s)
 * no Business Console (Settings → API & Webhooks → Add destination →
 * `https://<host>/v1/webhooks/didit`, eventos: no mínimo `status.updated`).
 * A Didit EXIGE pelo menos um destino cadastrado para liberar a
 * aplicação, mesmo com `DiditService` usando só as APIs standalone
 * (síncronas, sem sessão) — este controller existe para satisfazer essa
 * exigência com um endpoint de verdade, assinado de verdade
 * (`DiditWebhookGuard`), não um placeholder.
 *
 * HONESTO SOBRE O ESCOPO: como `DiditService.verifyId`/`faceMatch`/
 * `passiveLiveness` não criam sessão (cada chamada já devolve o
 * resultado na resposta HTTP, usado por `RottaAiService` na hora), os
 * eventos de sessão que a Didit manda aqui (`status.updated` etc.) HOJE
 * não correspondem a nada gravado no banco da Rotta — não existe
 * `session_id`/`vendor_data` para correlacionar de volta a um
 * `VehicleDocument`/`DriverDocument`. Por isso este handler só loga o
 * evento (nível que dá pra auditar no Render/observability) e sempre
 * responde 200 — nunca inventa uma correlação que não existe. Se um dia
 * a Rotta migrar para o fluxo de sessão/hospedado da Didit (workflow),
 * é aqui que a correlação por `vendor_data` (nosso `documentId`) entra.
 *
 * Sempre 2xx (mesmo padrão de `AbacatePayWebhookController`): a Didit
 * reentrega em 5xx/404 (até 2 vezes, backoff de ~1min e ~4min) — nunca
 * forçar retry por um evento que não temos onde persistir.
 */
@ApiExcludeController()
@Controller("webhooks/didit")
@Public()
@UseGuards(DiditWebhookGuard)
export class DiditWebhookController {
  private readonly logger = new Logger(DiditWebhookController.name);

  @Post()
  @HttpCode(HttpStatus.OK)
  handle(@Body() event: DiditWebhookEnvelope): { ok: true } {
    this.logger.log(
      `Webhook Didit recebido: ${event.webhook_type} (event_id=${event.event_id}, status=${event.status ?? "-"}, session_id=${event.session_id ?? "-"}, vendor_data=${event.vendor_data ?? "-"}, environment=${event.environment ?? "-"}).`,
    );
    return { ok: true };
  }
}

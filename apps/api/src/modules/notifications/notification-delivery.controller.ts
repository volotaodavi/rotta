import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from "@nestjs/common";
import { ApiExcludeController } from "@nestjs/swagger";

import { NotificationDeliveryRunnerService } from "./processors/notification-delivery-runner.service";

import type { ChannelDeliveryJobData } from "./processors/channel-delivery-job";

import { Public } from "@/common/decorators/public.decorator";
import { PermanentDeliveryError } from "@/infra/queue/qstash/permanent-delivery-error";
import { QstashSignatureGuard } from "@/infra/queue/qstash/qstash-signature.guard";

/**
 * "Worker" de entrega de notificações via QStash (Dossiê 14) — substitui
 * os 5 processors BullMQ (`@Processor`/`WorkerHost`) por um único
 * endpoint HTTP: o QStash entrega cada job publicado por
 * `NotificationsService.dispatchChannel` fazendo `POST` aqui, com
 * `retries`/`flowControl` já configurados na hora de publicar (ver
 * `EXTERNAL_CHANNEL_JOB_OPTS` em `notifications.service.ts`).
 *
 * `@Public()` (fora do `JwtAuthGuard` — o QStash não tem um JWT de
 * usuário) + `QstashSignatureGuard` (única defesa real deste endpoint,
 * ver o Guard para o porquê).
 */
@ApiExcludeController()
@Controller("internal/queue/notifications")
@Public()
@UseGuards(QstashSignatureGuard)
export class NotificationDeliveryController {
  constructor(private readonly runner: NotificationDeliveryRunnerService) {}

  /**
   * Entrega de um canal externo. Responde 200 tanto em sucesso quanto em
   * falha PERMANENTE (`PermanentDeliveryError` — já escala para o
   * fallback aqui mesmo, nenhum retry do QStash ajudaria); qualquer
   * outro erro propaga (NestJS responde 5xx) para o QStash tentar de
   * novo sozinho, até esgotar `retries` e chamar `deliver/dlq` abaixo.
   */
  @Post("deliver")
  @HttpCode(HttpStatus.OK)
  async deliver(@Body() data: ChannelDeliveryJobData): Promise<{ ok: true }> {
    try {
      await this.runner.run(data);
    } catch (error) {
      if (error instanceof PermanentDeliveryError) {
        this.runner.logFailure(data, error);
        await this.runner.handlePermanentFailure(data);
        return { ok: true };
      }
      throw error;
    }
    return { ok: true };
  }

  /**
   * Failure Callback do QStash (`failureCallback` configurado em
   * `dispatchChannel`) — chamado quando TODAS as tentativas de
   * `deliver` acima se esgotam sem uma resposta 2xx. Substitui o
   * `OnWorkerEvent('failed')` do BullMQ após esgotar `attempts`: aqui é
   * onde o "trocar canal" do Delivery AI (briefing "AGENTE 03")
   * finalmente acontece para uma falha de INFRAESTRUTURA persistente
   * (não confundir com `PermanentDeliveryError`, tratada direto em
   * `deliver`, sem depender deste callback).
   *
   * O envelope exato que o QStash envia a um `failureCallback` não pôde
   * ser verificado contra a documentação oficial ao escrever este
   * código (rede do ambiente bloqueada); a extração abaixo assume o
   * formato documentado publicamente (`sourceBody` em base64, contendo
   * o corpo original de `deliver`) e NUNCA lança se o formato vier
   * diferente — apenas loga um aviso e não escala (best-effort, mesmo
   * espírito de `recordAudit`/`handlePermanentFailure`: perder esta
   * notificação de falha final não pode derrubar nada). Antes de
   * depender disto em produção, confirme o formato no console
   * Upstash/documentação atual.
   */
  @Post("deliver/dlq")
  @HttpCode(HttpStatus.OK)
  async deliverDlq(@Body() payload: { sourceBody?: string }): Promise<{ ok: true }> {
    const data = this.parseSourceBody(payload);
    if (!data) {
      return { ok: true };
    }
    this.runner.logFailure(data, new Error("Todas as tentativas do QStash se esgotaram."));
    await this.runner.handlePermanentFailure(data);
    return { ok: true };
  }

  private parseSourceBody(payload: { sourceBody?: string }): ChannelDeliveryJobData | undefined {
    if (!payload.sourceBody) return undefined;
    try {
      return JSON.parse(
        Buffer.from(payload.sourceBody, "base64").toString("utf8"),
      ) as ChannelDeliveryJobData;
    } catch {
      return undefined;
    }
  }
}

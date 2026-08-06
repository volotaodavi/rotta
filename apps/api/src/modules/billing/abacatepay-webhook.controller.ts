import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from "@nestjs/common";
import { ApiExcludeController } from "@nestjs/swagger";

import { AbacatePayWebhookGuard } from "./abacatepay-webhook.guard";
import { BillingService } from "./billing.service";

import type { AbacatePayWebhookEnvelope } from "./types/abacatepay.types";

import { Public } from "@/common/decorators/public.decorator";

/**
 * Endpoint público que a AbacatePay chama a cada evento de assinatura
 * (Dossiê 26) — URL cadastrada no dashboard dela com
 * `?webhookSecret=...` (ver relatório de entrega para o valor exato).
 * Sempre responde 200: tanto no caminho feliz quanto quando a
 * correlação com uma `Company` falha (`BillingService` só loga um
 * aviso) — reentrega da AbacatePay não resolveria um erro de
 * correlação permanente, então nunca força retry nesse caso.
 */
@ApiExcludeController()
@Controller("webhooks/abacatepay")
@Public()
@UseGuards(AbacatePayWebhookGuard)
export class AbacatePayWebhookController {
  constructor(private readonly billingService: BillingService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async handle(@Body() event: AbacatePayWebhookEnvelope): Promise<{ ok: true }> {
    await this.billingService.handleWebhookEvent(event);
    return { ok: true };
  }
}

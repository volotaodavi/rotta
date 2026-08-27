import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from "@nestjs/common";
import { ApiExcludeController } from "@nestjs/swagger";

import { AsaasWebhookGuard } from "./asaas-webhook.guard";
import { BillingService } from "./billing.service";

import type { AsaasWebhookEnvelope } from "./types/asaas.types";

import { Public } from "@/common/decorators/public.decorator";

/**
 * Endpoint público que a Asaas chama a cada evento de pagamento/assinatura
 * (Dossiê 26) — URL cadastrada no dashboard dela com o header
 * `asaas-access-token` (ver relatório de entrega para o valor exato).
 * Sempre responde 200: tanto no caminho feliz quanto quando a
 * correlação com uma `Company` falha (`BillingService` só loga um
 * aviso) — reentrega da Asaas não resolveria um erro de correlação
 * permanente, então nunca força retry nesse caso.
 */
@ApiExcludeController()
@Controller("webhooks/asaas")
@Public()
@UseGuards(AsaasWebhookGuard)
export class AsaasWebhookController {
  constructor(private readonly billingService: BillingService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async handle(@Body() event: AsaasWebhookEnvelope): Promise<{ ok: true }> {
    await this.billingService.handleAsaasWebhookEvent(event);
    return { ok: true };
  }
}

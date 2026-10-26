import { Module } from "@nestjs/common";

import { LytexClientService } from "./lytex-client.service";
import { LytexSubcontasService } from "./lytex-subcontas.service";
import { LytexWebhookGuard } from "./lytex-webhook.guard";
import { LYTEX_WEBHOOK_EVENT_REPOSITORY } from "./repositories/lytex-webhook-event.repository";
import { PrismaLytexWebhookEventRepository } from "./repositories/prisma-lytex-webhook-event.repository";

/**
 * A integração com a Lytex, a provedora que emite a mensalidade da
 * família e faz o split da taxa da Rotta desde 23/10/2026.
 *
 * ## O que mora aqui, e o que não mora
 *
 * Aqui mora o que é da provedora: o cliente HTTP com o token OAuth, a
 * subconta, o split e a guarda do webhook. Não mora nada de regra de
 * negócio da Rotta: fatura, competência, contrato e carteira são de
 * `FamilyBillingModule`.
 *
 * A dependência é de mão única, `FamilyBillingModule` para cá, e é por
 * isso que o CONTROLADOR do webhook fica lá e não aqui: trazê-lo para
 * este módulo exigiria depender de volta do serviço da família e fechar
 * o ciclo entre os dois. O guard e o registro de idempotência são
 * exportados justamente para o controlador de lá usar.
 *
 * O Asaas continua existindo em `BillingModule`, cobrando a assinatura
 * da própria Rotta das transportadoras. Os dois fluxos não compartilham
 * mais nada.
 */
@Module({
  providers: [
    LytexClientService,
    LytexSubcontasService,
    LytexWebhookGuard,
    { provide: LYTEX_WEBHOOK_EVENT_REPOSITORY, useClass: PrismaLytexWebhookEventRepository },
  ],
  exports: [
    LytexClientService,
    LytexSubcontasService,
    LytexWebhookGuard,
    LYTEX_WEBHOOK_EVENT_REPOSITORY,
  ],
})
export class LytexModule {}

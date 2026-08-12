import { Module } from "@nestjs/common";

import { DiditWebhookController } from "./didit-webhook.controller";
import { DiditWebhookGuard } from "./didit-webhook.guard";
import { DiditService } from "./didit.service";

/**
 * `DiditWebhookController` fica aqui (não em `RottaAiModule`) porque é
 * infraestrutura da própria integração com a Didit — mesmo raciocínio
 * de `AbacatePayWebhookController` viver dentro de `BillingModule`, não
 * de um módulo de domínio separado.
 */
@Module({
  controllers: [DiditWebhookController],
  providers: [DiditService, DiditWebhookGuard],
  exports: [DiditService],
})
export class DiditModule {}

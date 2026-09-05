import { Module } from "@nestjs/common";

import { DiditWebhookProvisioningService } from "./didit-webhook-provisioning.service";
import { DiditWebhookController } from "./didit-webhook.controller";
import { DiditWebhookGuard } from "./didit-webhook.guard";
import { DiditService } from "./didit.service";

import { MessagePersonalizationModule } from "@/modules/notifications/message-personalization.module";

/**
 * `DiditWebhookController` fica aqui (não em `RottaAiModule`) porque é
 * infraestrutura da própria integração com a Didit — mesmo raciocínio
 * de `AsaasWebhookController` viver dentro de `BillingModule`, não
 * de um módulo de domínio separado. `DiditWebhookProvisioningService`
 * roda uma vez (`OnModuleInit`) e auto-registra o destino de webhook na
 * própria Didit — ver nota completa nele. Este módulo é importado tanto
 * por `RottaAiModule` quanto por `IdentityVerificationModule`, mas o
 * Nest resolve os dois imports para a MESMA instância (singleton por
 * módulo), então o auto-registro roda uma única vez por subida do
 * processo, nunca duplicado.
 */
@Module({
  imports: [MessagePersonalizationModule],
  controllers: [DiditWebhookController],
  providers: [DiditService, DiditWebhookGuard, DiditWebhookProvisioningService],
  exports: [DiditService],
})
export class DiditModule {}

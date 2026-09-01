import { Module } from "@nestjs/common";

import { DocumentExpiryQueueController } from "./document-expiry-queue.controller";
import { DocumentExpirySchedulerService } from "./document-expiry-scheduler.service";
import { DocumentExpiryService } from "./document-expiry.service";

import { MessagePersonalizationModule } from "@/modules/notifications/message-personalization.module";
import { UsersModule } from "@/modules/users/users.module";

/**
 * Lembrete diário de documento vencendo (CNH/EAR/Curso/Antecedentes do
 * motorista, CRLV/Licenciamento/Seguro/Laudo/Vistoria do veículo) —
 * pedido do usuário 01/09/2026. Módulo próprio (não vive em
 * `DriversModule`/`VehiclesModule`) pelo mesmo motivo de
 * `AdminDigestModule`/`TrialNotificationsModule`: acionado por
 * cron/QStash, lê os dois domínios pra montar UM job, nenhum dos dois
 * deveria depender do outro só por causa disto.
 */
@Module({
  imports: [UsersModule, MessagePersonalizationModule],
  controllers: [DocumentExpiryQueueController],
  providers: [DocumentExpiryService, DocumentExpirySchedulerService],
})
export class DocumentExpiryModule {}

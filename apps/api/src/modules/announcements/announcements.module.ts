import { Module } from "@nestjs/common";

import { ANNOUNCEMENT_REPOSITORY } from "./announcements.constants";
import { AnnouncementsController } from "./announcements.controller";
import { AnnouncementsService } from "./announcements.service";
import { PrismaAnnouncementRepository } from "./repositories/prisma-announcement.repository";

import { MessagePersonalizationModule } from "@/modules/notifications/message-personalization.module";
import { UsersModule } from "@/modules/users/users.module";

/**
 * Módulo Avisos/Comunicados (pedido do usuário: "no painel do admin
 * também deverá ter uma aba de criação de avisos, comunicados e
 * notificações gerais") — broadcast do Admin Rotta pro público
 * escolhido. `UsersModule` resolve os destinatários de cada público;
 * `MessagePersonalizationModule` só padroniza o payload do evento
 * (mesmo papel de `SupportModule`).
 */
@Module({
  imports: [UsersModule, MessagePersonalizationModule],
  controllers: [AnnouncementsController],
  providers: [
    AnnouncementsService,
    { provide: ANNOUNCEMENT_REPOSITORY, useClass: PrismaAnnouncementRepository },
  ],
  exports: [AnnouncementsService],
})
export class AnnouncementsModule {}

import { Module } from "@nestjs/common";


import { CONVERSATION_REPOSITORY } from "./conversations.constants";
import { ConversationsController } from "./conversations.controller";
import { ConversationsService } from "./conversations.service";
import { PrismaConversationRepository } from "./repositories/prisma-conversation.repository";

import { AuditModule } from "@/modules/audit/audit.module";
import { MessagePersonalizationModule } from "@/modules/notifications/message-personalization.module";
import { UsersModule } from "@/modules/users/users.module";

/**
 * Módulo Conversations (Frente 10(d)) — chat direto Responsável ↔
 * Motorista/Monitor, escopado por `Contract`. Não importa
 * `MarketplaceModule`/`ContractsService`: o RBAC lê `Contract` direto
 * via `PrismaService` (ver doc de `ConversationsService`), evitando a
 * dependência circular que existiria se `MarketplaceModule`
 * (candidato natural a também precisar de `ConversationsService` no
 * futuro, ex. "ver conversa" na tela do contrato) importasse de volta
 * este módulo — mesmo raciocínio de `StudentsModule` não importar
 * `RoutesModule`/`TripsModule`.
 */
@Module({
  imports: [AuditModule, MessagePersonalizationModule, UsersModule],
  controllers: [ConversationsController],
  providers: [
    ConversationsService,
    { provide: CONVERSATION_REPOSITORY, useClass: PrismaConversationRepository },
  ],
  exports: [ConversationsService],
})
export class ConversationsModule {}

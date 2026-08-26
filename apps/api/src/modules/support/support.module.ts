import { Module } from "@nestjs/common";

import { EmailModule } from "@/infra/email/email.module";
import { GroqModule } from "@/infra/groq/groq.module";
import { AuditModule } from "@/modules/audit/audit.module";
import { MessagePersonalizationModule } from "@/modules/notifications/message-personalization.module";
import { UsersModule } from "@/modules/users/users.module";

import { PrismaSupportMessageRepository } from "./repositories/prisma-support-message.repository";
import { PrismaSupportTicketRepository } from "./repositories/prisma-support-ticket.repository";
import { SUPPORT_MESSAGE_REPOSITORY, SUPPORT_TICKET_REPOSITORY } from "./support.constants";
import { SupportController } from "./support.controller";
import { SupportService } from "./support.service";

/**
 * Módulo Suporte (Dossiê 20, `SUP-01` a `SUP-03` / `ADM-04`; Dossiê 29
 * — Prompt 21, Backoffice, Fase 1) — canal de tickets/mensagens entre
 * tenants e a equipe Rotta. `AuditModule` é importado (nunca
 * reimplementado) para a trilha de auditoria de cada ação do chamado,
 * mesmo padrão de `DriversModule`/`CompaniesModule`. `UsersModule`
 * (listar Admin Rotta + resolver nome do autor),
 * `MessagePersonalizationModule` (texto das notificações) e
 * `EmailModule` (cópia direta pra caixa fixa da Rotta) sustentam a
 * notificação de novo chamado/mensagem. `GroqModule` (Frente 5) tenta
 * responder dúvidas simples automaticamente.
 */
@Module({
  imports: [AuditModule, UsersModule, MessagePersonalizationModule, EmailModule, GroqModule],
  controllers: [SupportController],
  providers: [
    SupportService,
    { provide: SUPPORT_TICKET_REPOSITORY, useClass: PrismaSupportTicketRepository },
    { provide: SUPPORT_MESSAGE_REPOSITORY, useClass: PrismaSupportMessageRepository },
  ],
  exports: [SupportService],
})
export class SupportModule {}

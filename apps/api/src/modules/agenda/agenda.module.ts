import { Module } from "@nestjs/common";

import { AGENDA_EVENT_REPOSITORY } from "./agenda.constants";
import { AgendaController } from "./agenda.controller";
import { AgendaService } from "./agenda.service";
import { PrismaAgendaEventRepository } from "./repositories/prisma-agenda-event.repository";

import { AuditModule } from "@/modules/audit/audit.module";

/**
 * Módulo Agenda (Dossiê 8 §14 / EF Parte 6, tarefa #101) — calendário
 * único de feriados, recessos, eventos escolares e ausências
 * planejadas. Só importa `AuditModule` (registro best-effort de
 * criação/edição/remoção) — diferente de `RoutesModule`/`TripsModule`,
 * não precisa resolver nomes para o Message Personalization AI porque
 * este módulo ainda não dispara nenhuma notificação (FORA DE ESCOPO,
 * ver `AgendaService`).
 */
@Module({
  imports: [AuditModule],
  controllers: [AgendaController],
  providers: [
    AgendaService,
    { provide: AGENDA_EVENT_REPOSITORY, useClass: PrismaAgendaEventRepository },
  ],
  exports: [AgendaService],
})
export class AgendaModule {}

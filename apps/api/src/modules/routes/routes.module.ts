import { Module } from "@nestjs/common";


import { PrismaRouteStopRepository } from "./repositories/prisma-route-stop.repository";
import { PrismaRouteStudentRepository } from "./repositories/prisma-route-student.repository";
import { PrismaRouteRepository } from "./repositories/prisma-route.repository";
import {
  ROUTE_REPOSITORY,
  ROUTE_STOP_REPOSITORY,
  ROUTE_STUDENT_REPOSITORY,
} from "./routes.constants";
import { RoutesController } from "./routes.controller";
import { RoutesService } from "./routes.service";

import { AuditModule } from "@/modules/audit/audit.module";
import { MarketplaceModule } from "@/modules/marketplace/marketplace.module";
import { MessagePersonalizationModule } from "@/modules/notifications/message-personalization.module";
import { StudentsModule } from "@/modules/students/students.module";
import { UsersModule } from "@/modules/users/users.module";

/**
 * Módulo Rotas (Dossiê 13, Seção 10 / Especificação Funcional Parte 4,
 * ROT-01/02/04/07) — modelagem estrutural de rotas: paradas, alunos
 * vinculados, motorista/veículo/monitor padrão. A execução concreta de
 * uma rota em um dia (início/fim de viagem, checklist de embarque/
 * desembarque, posições GPS) vive em `TripsModule` — este módulo é só o
 * "molde" que `TripsService` usa para abrir cada viagem.
 *
 * Importa `MarketplaceModule` (`ContractsService.findRawByIdOrThrow` —
 * um aluno só entra numa rota a partir de um `Contract` ATIVO, nunca
 * diretamente por `studentId`), `StudentsModule` (nome do aluno para o
 * Message Personalization AI), `UsersModule` (validar vínculo ativo de
 * Motorista/Monitor antes de definí-lo como padrão da rota, mesmo
 * princípio de `VehiclesService.assign`), `AuditModule` e
 * `MessagePersonalizationModule` (nunca `NotificationsModule` inteiro —
 * mesma justificativa de `marketplace.module.ts`). `EventEmitter2` é
 * injetado sem import extra (global em `AppModule`).
 */
@Module({
  imports: [
    AuditModule,
    MarketplaceModule,
    StudentsModule,
    UsersModule,
    MessagePersonalizationModule,
  ],
  controllers: [RoutesController],
  providers: [
    RoutesService,
    { provide: ROUTE_REPOSITORY, useClass: PrismaRouteRepository },
    { provide: ROUTE_STOP_REPOSITORY, useClass: PrismaRouteStopRepository },
    { provide: ROUTE_STUDENT_REPOSITORY, useClass: PrismaRouteStudentRepository },
  ],
  exports: [RoutesService],
})
export class RoutesModule {}

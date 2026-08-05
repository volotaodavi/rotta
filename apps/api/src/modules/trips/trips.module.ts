import { Module } from "@nestjs/common";

import { PrismaTripPositionRepository } from "./repositories/prisma-trip-position.repository";
import { PrismaTripStudentEventRepository } from "./repositories/prisma-trip-student-event.repository";
import { PrismaTripRepository } from "./repositories/prisma-trip.repository";
import {
  TRIP_POSITION_REPOSITORY,
  TRIP_REPOSITORY,
  TRIP_STUDENT_EVENT_REPOSITORY,
} from "./trips.constants";
import { TripsController } from "./trips.controller";
import { TripsService } from "./trips.service";

import { AuditModule } from "@/modules/audit/audit.module";
import { GeoModule } from "@/modules/geo/geo.module";
import { MarketplaceModule } from "@/modules/marketplace/marketplace.module";
import { MessagePersonalizationModule } from "@/modules/notifications/message-personalization.module";
import { RoutesModule } from "@/modules/routes/routes.module";
import { StudentsModule } from "@/modules/students/students.module";
import { UsersModule } from "@/modules/users/users.module";
import { VehiclesModule } from "@/modules/vehicles/vehicles.module";

/**
 * Módulo Trips (Dossiê 13, Seção 11 / Especificação Funcional Parte 4,
 * GPS-01/02/03/06 + EMB-01/05 + DESEMB-01/03) — execução concreta de
 * uma rota em um dia: início/fim de viagem, ingestão de posição GPS,
 * checklist de embarque/desembarque. Importa `RoutesModule` (o "molde"
 * de cada viagem — motorista/veículo/monitor padrão, alunos vinculados,
 * paradas), `VehiclesModule` (sincroniza `Vehicle.viagemAtualId`/última
 * posição — `VehiclesService.setCurrentTrip`/`updateLocationFromTrip`),
 * `MarketplaceModule`/`StudentsModule`/`UsersModule` (resolver nomes
 * para o Message Personalization AI), `MessagePersonalizationModule`
 * (nunca `NotificationsModule` inteiro — mesma justificativa de
 * `routes.module.ts`) e `GeoModule` (`GeoEngineService` — única porta
 * de saída para o OSRM, usado por `recalcularProximasEtas`/
 * `recalcularEnotificarBestEffort`, tarefa #99). Sem ciclo: nenhum
 * desses módulos importa `TripsModule` de volta.
 */
@Module({
  imports: [
    AuditModule,
    RoutesModule,
    VehiclesModule,
    MarketplaceModule,
    StudentsModule,
    UsersModule,
    MessagePersonalizationModule,
    GeoModule,
  ],
  controllers: [TripsController],
  providers: [
    TripsService,
    { provide: TRIP_REPOSITORY, useClass: PrismaTripRepository },
    { provide: TRIP_POSITION_REPOSITORY, useClass: PrismaTripPositionRepository },
    { provide: TRIP_STUDENT_EVENT_REPOSITORY, useClass: PrismaTripStudentEventRepository },
  ],
  exports: [TripsService],
})
export class TripsModule {}

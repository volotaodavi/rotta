import { Module } from "@nestjs/common";

import { RouteAssignmentsController } from "./route-assignments.controller";
import { RouteAssignmentsService } from "./route-assignments.service";

/**
 * Escala do dia (24/09/2026).
 *
 * Não importa `RoutesModule` nem `VehiclesModule` de propósito: as
 * checagens que faz (rota é desta empresa? ônibus é desta empresa?) são
 * duas consultas diretas e escopadas, e puxar os dois módulos inteiros
 * criaria dependências que ninguém precisa — `VehiclesModule` já arrasta
 * `RottaAiModule -> GeoModule -> SchoolsModule` atrás.
 *
 * É lido pelo módulo de rastreadores, que decide por ele qual viagem
 * abrir quando a ignição liga.
 */
@Module({
  controllers: [RouteAssignmentsController],
  providers: [RouteAssignmentsService],
  exports: [RouteAssignmentsService],
})
export class RouteAssignmentsModule {}

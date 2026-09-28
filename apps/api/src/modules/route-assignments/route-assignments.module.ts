import { Module } from "@nestjs/common";

import { PrismaRouteAssignmentRepository } from "./repositories/prisma-route-assignment.repository";
import { ROUTE_ASSIGNMENT_REPOSITORY } from "./route-assignments.constants";
import { RouteAssignmentsController } from "./route-assignments.controller";
import { RouteAssignmentsService } from "./route-assignments.service";

import { PrismaRouteRepository } from "@/modules/routes/repositories/prisma-route.repository";
import { ROUTE_REPOSITORY } from "@/modules/routes/routes.constants";
import { PrismaVehicleRepository } from "@/modules/vehicles/repositories/prisma-vehicle.repository";
import { VEHICLE_REPOSITORY } from "@/modules/vehicles/vehicles.constants";

/**
 * Escala do dia (24/09/2026).
 *
 * Não importa `RoutesModule` nem `VehiclesModule` de propósito: as
 * checagens que faz (rota é desta empresa? ônibus é desta empresa?) são
 * duas consultas diretas e escopadas, e puxar os dois módulos inteiros
 * criaria dependências que ninguém precisa — `VehiclesModule` já arrasta
 * `RottaAiModule -> GeoModule -> SchoolsModule` atrás.
 *
 * Desde a auditoria de 26/09/2026 (item 5) essas duas consultas não são
 * mais `this.prisma.route.findFirst` dentro do serviço: são
 * `ROUTE_REPOSITORY`/`VEHICLE_REPOSITORY`, declarados aqui como
 * providers LOCAIS. São IMPORTS DE ARQUIVO, não de módulo — nenhum
 * `imports:` aponta para lá, então a razão acima continua valendo. As
 * duas classes são sem estado e dependem só de `PrismaService`, que é
 * `@Global()`.
 *
 * É lido pelo módulo de rastreadores, que decide por ele qual viagem
 * abrir quando a ignição liga.
 */
@Module({
  controllers: [RouteAssignmentsController],
  providers: [
    RouteAssignmentsService,
    { provide: ROUTE_ASSIGNMENT_REPOSITORY, useClass: PrismaRouteAssignmentRepository },
    { provide: ROUTE_REPOSITORY, useClass: PrismaRouteRepository },
    { provide: VEHICLE_REPOSITORY, useClass: PrismaVehicleRepository },
  ],
  exports: [RouteAssignmentsService, ROUTE_ASSIGNMENT_REPOSITORY],
})
export class RouteAssignmentsModule {}

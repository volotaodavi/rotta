import { Module } from "@nestjs/common";

import { TrackerIngestGuard } from "./tracker-ingest.guard";
import { TrackersController } from "./trackers.controller";
import { TrackersService } from "./trackers.service";

import { RouteAssignmentsModule } from "@/modules/route-assignments/route-assignments.module";
import { RoutesModule } from "@/modules/routes/routes.module";
import { TripsModule } from "@/modules/trips/trips.module";
import { VehiclesModule } from "@/modules/vehicles/vehicles.module";

/**
 * Ingestão de posições de rastreador físico (24/09/2026).
 *
 * Importa `TripsModule` e `VehiclesModule` porque o objetivo é
 * justamente NÃO ter um caminho paralelo: o ônibus com rastreador abre
 * e encerra viagem pelo mesmo `TripsService.start`/`finish` que o
 * ônibus tocado pelo app, e grava posição na mesma tabela. Duas portas
 * para o mesmo fato acabariam divergindo, e a divergência apareceria
 * como um ônibus fantasma no mapa de uma família.
 *
 * `RoutesModule` e `RouteAssignmentsModule` entraram na auditoria de
 * 26/09/2026 (item 5), quando as quatro consultas que este serviço
 * fazia direto no Prisma (ônibus pelo IMEI, escalas do dia, rota padrão
 * do ônibus, viagens já encerradas) viraram métodos de repositório. Os
 * quatro tokens vêm dos módulos donos de cada tabela, não de cópias
 * locais — aqui dá para importar os módulos de verdade porque nenhum
 * deles importa este de volta.
 *
 * Nenhum outro módulo importa este: a direção é só de fora para dentro.
 */
@Module({
  imports: [TripsModule, VehiclesModule, RoutesModule, RouteAssignmentsModule],
  controllers: [TrackersController],
  providers: [TrackersService, TrackerIngestGuard],
  exports: [TrackersService],
})
export class TrackersModule {}

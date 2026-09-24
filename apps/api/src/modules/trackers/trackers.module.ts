import { Module } from "@nestjs/common";

import { TrackerIngestGuard } from "./tracker-ingest.guard";
import { TrackersController } from "./trackers.controller";
import { TrackersService } from "./trackers.service";

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
 * Nenhum outro módulo importa este: a direção é só de fora para dentro.
 */
@Module({
  imports: [TripsModule, VehiclesModule],
  controllers: [TrackersController],
  providers: [TrackersService, TrackerIngestGuard],
  exports: [TrackersService],
})
export class TrackersModule {}

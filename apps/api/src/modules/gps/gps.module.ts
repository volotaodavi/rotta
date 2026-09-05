import { Module } from "@nestjs/common";

import { GpsController } from "./gps.controller";

import { TripsModule } from "@/modules/trips/trips.module";

/**
 * Módulo GPS (Dossiê 13, Seção 12) — camada de LEITURA agregada sobre o
 * módulo Trips: mapa operacional (Empresa/Gestor), localizador do
 * Responsável e trilha histórica de uma viagem. A INGESTÃO de posição
 * (uplink, POST) vive em `TripsController` (`POST /trips/:id/positions`)
 * — este módulo nunca escreve, só compõe views de leitura para o
 * "localizador"/mapa. O canal de tempo real (WebSocket/Socket.IO) vive
 * em `apps/realtime-gateway` (Dossiê 12, Seção 1.3) — serviço separado,
 * ainda não criado nesta fase (o frontend hoje faz polling do REST).
 */
@Module({
  imports: [TripsModule],
  controllers: [GpsController],
})
export class GpsModule {}

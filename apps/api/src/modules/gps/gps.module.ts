import { Module } from "@nestjs/common";

/**
 * Modulo GPS (Dossie 13, Secao 12) — ingestao e consulta de posicoes via
 * REST (uplink em lote, ultima posicao, trilha historica). O canal de
 * tempo real (WebSocket/Socket.IO) vive em `apps/realtime-gateway`
 * (Dossie 12, Secao 1.3) — servico separado, ainda nao criado nesta fase.
 *
 * ESTADO ATUAL: modulo vazio (fase de fundacao).
 */
@Module({})
export class GpsModule {}

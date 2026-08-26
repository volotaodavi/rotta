import { ApiProperty } from "@nestjs/swagger";

/**
 * Uma parada ainda pendente hoje, com ETA recalculado a partir da
 * última posição GPS conhecida do veículo (tarefa #99, ROT-08 real —
 * distinto do `RottaAiService.suggestRouteOptimization`, que é sobre
 * REORDENAR paradas, não recalcular tempo). `distanciaMetros`/
 * `etaSegundos` são acumulados: já somam todas as pernas do trajeto
 * atual até esta parada, não só o trecho anterior.
 */
export class NextEtaResponseDto {
  @ApiProperty() routeStopId!: string;
  @ApiProperty() endereco!: string;
  /** Horário fixo cadastrado na parada (`RouteStop.horarioPrevisto`, "HH:mm") — para comparar com o ETA recalculado. */
  @ApiProperty() horarioPrevisto!: string;
  @ApiProperty() distanciaMetros!: number;
  @ApiProperty() etaSegundos!: number;
  /** ISO 8601 — `now() + etaSegundos`. */
  @ApiProperty() etaPrevista!: string;
  /** Coordenada real do waypoint (pode ser um desvio de endereço do dia — ver `TripsService.listPendenciasPorAluno`) — alimenta a linha azul traçada até aqui no mapa do Responsável/Motorista/Monitor. */
  @ApiProperty() latitude!: number;
  @ApiProperty() longitude!: number;
}

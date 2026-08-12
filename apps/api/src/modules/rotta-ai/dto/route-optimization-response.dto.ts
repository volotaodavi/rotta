import { ApiProperty } from "@nestjs/swagger";

/**
 * Resposta real de `RottaAiService.suggestRouteOptimization` (ROT-08) —
 * Rotta Route AI via OSRM `/trip`. Nunca altera a rota (`RouteStop`
 * permanece com a `ordem` atual até o Gestor aceitar explicitamente a
 * sugestão, Dossiê 18 §ROT-08: "a sugestão nunca altera a rota
 * automaticamente") — este DTO é só a comparação lado a lado que a tela
 * apresenta para o Gestor decidir.
 */
export class RouteOptimizationResponseDto {
  @ApiProperty() routeId!: string;

  @ApiProperty({
    type: [String],
    description: "IDs de RouteStop na ordem atualmente cadastrada.",
  })
  ordemAtualIds!: string[];

  @ApiProperty({
    type: [String],
    description:
      "IDs de RouteStop na ordem sugerida pela Rotta Route AI — origem e destino (primeira/última parada) permanecem fixos, só a ordem intermediária muda.",
  })
  ordemSugeridaIds!: string[];

  @ApiProperty({ description: "Duração estimada da rota na ordem ATUAL, em segundos." })
  duracaoAtualSegundos!: number;

  @ApiProperty({ description: "Duração estimada da rota na ordem SUGERIDA, em segundos." })
  duracaoSugeridaSegundos!: number;

  @ApiProperty({
    description:
      "duracaoAtualSegundos - duracaoSugeridaSegundos, nunca negativo (a sugestão nunca é pior que a ordem atual — OSRM sempre inclui a ordem de entrada no espaço de busca).",
  })
  economiaSegundos!: number;

  @ApiProperty({ description: "Distância estimada da rota na ordem SUGERIDA, em metros." })
  distanciaSugeridaMetros!: number;

  @ApiProperty({
    description:
      "true quando a ordem sugerida é idêntica à atual (a rota já está na sequência mais eficiente) — a tela deve tratar isso como 'nada a aplicar', nunca como uma sugestão vazia/quebrada.",
  })
  jaOtimizada!: boolean;
}

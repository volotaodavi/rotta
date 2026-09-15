import type { TripSentido } from "@rotta/api-client";

/**
 * As paradas na ORDEM EM QUE VÃO SER PERCORRIDAS neste sentido —
 * mirror de `apps/mobile/src/features/routes/stop-direction.ts`.
 *
 * `RouteStop.ordem` é sempre a ordem da ida (as casas e, no fim, a
 * escola). Na volta o veículo faz o caminho inverso — sai da escola e
 * vai deixando cada aluno —, então a ordem de percurso é a lista
 * invertida. Mesma regra que o backend aplica em
 * `TripsService.listParadasPendentes`; existe aqui porque as telas
 * montam a própria lista a partir de `GET /routes/:id/stops` (que
 * devolve sempre na ordem cadastrada) e a usam pro traçado do mapa,
 * pros marcadores e pra sequência de cartões de parada — tudo coisa em
 * que a ordem é o conteúdo, não um detalhe.
 *
 * `sentido` indefinido (viagem ainda não iniciada) = ordem cadastrada:
 * antes de existir viagem não há sentido nenhum a respeitar.
 */
export function ordenarParadasPorSentido<T extends { ordem: number }>(
  paradas: T[],
  sentido: TripSentido | undefined,
): T[] {
  const porOrdem = [...paradas].sort((a, b) => a.ordem - b.ordem);
  return sentido === "VOLTA" ? porOrdem.reverse() : porOrdem;
}

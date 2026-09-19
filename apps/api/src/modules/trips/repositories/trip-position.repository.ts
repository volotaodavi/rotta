import type { TripPosition } from "@prisma/client";

export interface CreateTripPositionData {
  tripId: string;
  companyId: string;
  latitude: number;
  longitude: number;
  precisaoMetros?: number;
  velocidadeKmh?: number;
  capturadaEm: Date;
  simuladoSuspeito?: boolean;
}

/**
 * `trip_positions` tem RLS por `companyId`. Nunca atualizado/deletado —
 * só `create`/`createMany` (histórico bruto imutável, ver nota do
 * schema) e leituras ordenadas por `capturadaEm`.
 */
export interface TripPositionRepository {
  create(data: CreateTripPositionData): Promise<TripPosition>;
  createMany(data: CreateTripPositionData[]): Promise<TripPosition[]>;
  listByTrip(tripId: string): Promise<TripPosition[]>;
  findLatestByTrip(tripId: string): Promise<TripPosition | null>;
  /**
   * Quais dos instantes informados já existem nesta viagem.
   *
   * Existe para a fila offline do app (GPS-04): a fila só apaga o que o
   * servidor confirmou, então um lote entregue cuja RESPOSTA se perdeu
   * na volta será reenviado inteiro. Sem esta verificação, cada reenvio
   * duplicaria o trecho e o mapa do responsável mostraria o veículo
   * passando duas vezes pelo mesmo lugar.
   *
   * Deliberadamente NÃO é uma constraint `@@unique([tripId,
   * capturadaEm])`: criar essa constraint exigiria uma migration que
   * apaga duplicatas existentes, e numa tabela de milhões de linhas isso
   * roda na partida do container — recriaria o problema de cold start
   * que acabou de ser corrigido. A consulta aqui usa o índice
   * `@@index([tripId, capturadaEm])`, que já existe.
   */
  findCapturasExistentes(tripId: string, capturadas: Date[]): Promise<Date[]>;
}

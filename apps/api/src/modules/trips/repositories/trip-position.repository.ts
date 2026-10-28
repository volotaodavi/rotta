import type { TripPosition, TripPositionOrigem } from "@prisma/client";

export interface CreateTripPositionData {
  tripId: string;
  companyId: string;
  /**
   * Quem mandou esta posição. Omitido = `CELULAR`, pelo `@default` do
   * schema: o app foi a única fonte durante toda a vida da tabela.
   */
  origem?: TripPositionOrigem;
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
  /**
   * A posição mais recente do RASTREADOR nesta viagem, se ela for mais
   * nova que `limite`.
   *
   * É a pergunta "o aparelho do ônibus está falando agora?", e ela
   * decide se a posição do celular do motorista entra no trajeto ou é
   * ignorada. Devolve a posição em si, e não um booleano, porque quem
   * ignora o celular precisa responder ao app qual é, então, a posição
   * atual da viagem.
   *
   * Usa o índice `[tripId, origem, capturadaEm]`, criado para isto.
   */
  findUltimaDeRastreadorDesde(tripId: string, limite: Date): Promise<TripPosition | null>;
}

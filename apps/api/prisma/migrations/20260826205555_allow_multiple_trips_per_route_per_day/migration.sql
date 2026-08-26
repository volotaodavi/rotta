-- Pedido do usuário: "rotas não são feitas para ser finalizadas
-- concretamente... finalizar só encerra a viagem, não a rota — dá pra
-- iniciar de novo quando quiser, mesmo dia" (ex.: ida de manhã e volta
-- à tarde na mesma rota). O `@@unique([routeId, data])` de "trips"
-- impedia isso na prática: uma segunda Trip pra mesma rota no mesmo dia
-- sempre falhava no banco, mesmo depois da primeira já ter sido
-- finalizada/cancelada. TripsService.start já passa a ser quem garante
-- a única regra que de fato importa: nunca duas viagens ATIVAS
-- (EM_ANDAMENTO/PAUSADA) ao mesmo tempo pra mesma rota.

DROP INDEX "trips_routeId_data_key";

CREATE INDEX "trips_routeId_data_idx" ON "trips"("routeId", "data");

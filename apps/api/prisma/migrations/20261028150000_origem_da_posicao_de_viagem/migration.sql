-- Origem da posição de viagem: rastreador do ônibus ou celular do motorista.
--
-- O DEFAULT 'CELULAR' não é escolha estética: todo o histórico anterior
-- a esta migration veio do app, porque era a única fonte que existia.
-- Marcar o passado como CELULAR é verdade, e evita reescrever uma tabela
-- de milhões de linhas na partida do container (o mesmo cuidado de cold
-- start que já está documentado em `findCapturasExistentes`).

DO $$
BEGIN
  CREATE TYPE "TripPositionOrigem" AS ENUM ('RASTREADOR', 'CELULAR');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

ALTER TABLE "trip_positions"
  ADD COLUMN IF NOT EXISTS "origem" "TripPositionOrigem" NOT NULL DEFAULT 'CELULAR';

-- Sustenta a pergunta "o rastreador desta viagem falou nos últimos dois
-- minutos?", feita a cada leitura de GPS do app.
CREATE INDEX IF NOT EXISTS "trip_positions_tripId_origem_capturadaEm_idx"
  ON "trip_positions" ("tripId", "origem", "capturadaEm");

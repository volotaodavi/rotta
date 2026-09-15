-- Sentido da viagem (Ida/Volta) — pedido do usuário 15/09/2026,
-- "pode deixar na mesma rota um sentido, igual placa de ônibus".
--
-- IDA como default e como valor de backfill: toda viagem registrada
-- antes deste campo usou a semântica de ida (aluno embarca na parada
-- de embarque, desembarca na de desembarque), então IDA é o valor
-- historicamente correto pras linhas existentes, não um chute.
CREATE TYPE "TripSentido" AS ENUM ('IDA', 'VOLTA');

ALTER TABLE "trips" ADD COLUMN "sentido" "TripSentido" NOT NULL DEFAULT 'IDA';

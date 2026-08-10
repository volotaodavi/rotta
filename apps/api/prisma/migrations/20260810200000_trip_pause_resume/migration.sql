-- Prompt Mestre da Rotta, Secao 8 ("O sistema deve diferenciar ONLINE/
-- OFFLINE/EM_VIAGEM/PAUSADO/VIAGEM_FINALIZADA") — `Trip` so tinha
-- EM_ANDAMENTO/FINALIZADA/CANCELADA, sem como o motorista pausar uma
-- viagem em andamento. `ALTER TYPE ... ADD VALUE` nao pode rodar dentro
-- da mesma transacao que uma instrucao que USE o valor novo (limitacao
-- do Postgres) — por isso esta migration so adiciona o valor e a coluna
-- nullable, sem nenhum DEFAULT/CHECK que referencie 'PAUSADA'.
ALTER TYPE "TripStatus" ADD VALUE 'PAUSADA';

-- `pausadaEm`: preenchido enquanto a viagem esta PAUSADA, limpo ao
-- retomar — mesma convencao de `finalizadaEm`/`canceladaEm` (timestamp
-- nullable, nunca um booleano solto).
ALTER TABLE "trips" ADD COLUMN "pausadaEm" TIMESTAMP(3);

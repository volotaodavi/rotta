-- AlterTable
ALTER TABLE "trips" ADD COLUMN "codigo" VARCHAR(6);

-- Backfill: viagens já existentes nunca tiveram código nenhum (o campo
-- não existia) — gera um valor único por linha a partir de md5(random()
-- || id), maiúsculo, 6 caracteres. Base 36 (dígitos+letras) sobre 6
-- posições dá ~2,17 bilhões de combinações: colisão entre viagens já
-- existentes é praticamente impossível no volume real desta tabela. A
-- geração daqui pra frente (`TripsService.start`) já confere unicidade
-- de verdade antes de gravar — este backfill é só para linhas antigas.
UPDATE "trips"
SET "codigo" = upper(substr(md5(random()::text || "id"::text), 1, 6))
WHERE "codigo" IS NULL;

-- AlterTable
ALTER TABLE "trips" ALTER COLUMN "codigo" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "trips_codigo_key" ON "trips"("codigo");

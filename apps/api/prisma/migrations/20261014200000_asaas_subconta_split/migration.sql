-- Recebimento direto pela transportadora (split do Asaas).
--
-- `IF NOT EXISTS` em toda coluna por decisão do repositório: em
-- 06/10/2026 uma migração falhou pela metade e deixou o banco num estado
-- que travou TODO deploy seguinte com P3009. Coluna aditiva e idempotente
-- pode ser reaplicada sem quebrar, e esse é o ponto.
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "asaasWalletId" VARCHAR(64);
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "asaasSubaccountId" VARCHAR(64);
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "asaasSubaccountApiKey" TEXT;
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "asaasOnboardingStatus" VARCHAR(32);

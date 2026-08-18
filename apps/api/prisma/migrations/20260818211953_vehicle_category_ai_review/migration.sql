-- Frente AL — agente de categorização automática de veículo (pedido do
-- usuário: "particular" não faz sentido numa plataforma B2B de
-- transportadoras; a IA já sugere Escolar/Fretamento/Executivo sozinha e
-- marca "requer verificação" quando não tem certeza, sem bloquear o uso).

-- Renomeia o valor do enum (nunca DROP/ADD — preserva os veículos que já
-- usam esse valor hoje; auditoria confirmou que nenhuma regra de negócio
-- discrimina "PARTICULAR" especificamente, só `categoria === "ESCOLAR"`
-- em todo o backend).
ALTER TYPE "VehicleCategory" RENAME VALUE 'PARTICULAR' TO 'EXECUTIVO';

-- CreateEnum
CREATE TYPE "VehicleCategoryOrigin" AS ENUM ('MANUAL', 'IA');

-- CreateEnum
CREATE TYPE "VehicleCategoryReviewStatus" AS ENUM ('NAO_REQUER', 'PENDENTE', 'CONFIRMADA', 'CORRIGIDA');

-- AlterTable
ALTER TABLE "vehicles"
  ADD COLUMN "categoriaOrigem" "VehicleCategoryOrigin" NOT NULL DEFAULT 'MANUAL',
  ADD COLUMN "categoriaRevisaoStatus" "VehicleCategoryReviewStatus" NOT NULL DEFAULT 'NAO_REQUER',
  ADD COLUMN "categoriaConfiancaIa" INTEGER,
  ADD COLUMN "categoriaMotivoIa" TEXT,
  ADD COLUMN "categoriaRevisadaPorId" UUID,
  ADD COLUMN "categoriaRevisadaEm" TIMESTAMP(3);

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_categoriaRevisadaPorId_fkey" FOREIGN KEY ("categoriaRevisadaPorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "vehicles_companyId_categoriaRevisaoStatus_idx" ON "vehicles"("companyId", "categoriaRevisaoStatus");

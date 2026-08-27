-- CreateEnum
CREATE TYPE "VehicleAdminReviewStatus" AS ENUM ('PRE_APROVADO', 'APROVADO', 'REPROVADO');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationEventType" ADD VALUE 'VEICULO_REVISAO_APROVADA';
ALTER TYPE "NotificationEventType" ADD VALUE 'VEICULO_REVISAO_REPROVADA';

-- AlterTable
ALTER TABLE "vehicles" ADD COLUMN     "revisaoAdminDecididoEm" TIMESTAMP(3),
ADD COLUMN     "revisaoAdminDecididoPorId" UUID,
ADD COLUMN     "revisaoAdminObservacaoResponsaveis" TEXT,
ADD COLUMN     "revisaoAdminObservacaoTransportadora" TEXT,
ADD COLUMN     "revisaoAdminStatus" "VehicleAdminReviewStatus" NOT NULL DEFAULT 'PRE_APROVADO';

-- CreateTable
CREATE TABLE "vehicle_admin_review_acknowledgements" (
    "id" UUID NOT NULL,
    "vehicleId" UUID NOT NULL,
    "responsavelId" UUID NOT NULL,
    "decisaoEm" TIMESTAMP(3) NOT NULL,
    "aceitoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vehicle_admin_review_acknowledgements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "vehicle_admin_review_acknowledgements_responsavelId_idx" ON "vehicle_admin_review_acknowledgements"("responsavelId");

-- CreateIndex
CREATE UNIQUE INDEX "vehicle_admin_review_acknowledgements_vehicleId_responsavel_key" ON "vehicle_admin_review_acknowledgements"("vehicleId", "responsavelId", "decisaoEm");

-- CreateIndex
CREATE INDEX "vehicles_companyId_revisaoAdminStatus_idx" ON "vehicles"("companyId", "revisaoAdminStatus");

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_revisaoAdminDecididoPorId_fkey" FOREIGN KEY ("revisaoAdminDecididoPorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_admin_review_acknowledgements" ADD CONSTRAINT "vehicle_admin_review_acknowledgements_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_admin_review_acknowledgements" ADD CONSTRAINT "vehicle_admin_review_acknowledgements_responsavelId_fkey" FOREIGN KEY ("responsavelId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

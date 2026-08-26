-- CreateEnum
CREATE TYPE "StudentAddressOverrideTrecho" AS ENUM ('EMBARQUE', 'DESEMBARQUE', 'AMBOS');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationEventType" ADD VALUE 'ALUNO_VEZ_EMBARQUE';
ALTER TYPE "NotificationEventType" ADD VALUE 'ALUNO_VEZ_DESEMBARQUE';

-- AlterTable
ALTER TABLE "trips" ADD COLUMN     "ultimaParadaEmVezNotificadaId" UUID;

-- CreateTable
CREATE TABLE "student_address_overrides" (
    "id" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "data" DATE NOT NULL,
    "trecho" "StudentAddressOverrideTrecho" NOT NULL,
    "cep" TEXT NOT NULL,
    "logradouro" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "complemento" TEXT,
    "bairro" TEXT NOT NULL,
    "cidade" TEXT NOT NULL,
    "estado" TEXT NOT NULL,
    "latitude" DECIMAL(9,6) NOT NULL,
    "longitude" DECIMAL(9,6) NOT NULL,
    "observacao" TEXT,
    "criadoPorUserId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_address_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "student_address_overrides_studentId_data_idx" ON "student_address_overrides"("studentId", "data");

-- CreateIndex
CREATE UNIQUE INDEX "student_address_overrides_studentId_data_key" ON "student_address_overrides"("studentId", "data");

-- AddForeignKey
ALTER TABLE "student_address_overrides" ADD CONSTRAINT "student_address_overrides_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_address_overrides" ADD CONSTRAINT "student_address_overrides_criadoPorUserId_fkey" FOREIGN KEY ("criadoPorUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

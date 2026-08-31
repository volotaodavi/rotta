-- CreateEnum
CREATE TYPE "StudentAddressOverrideLocalTipo" AS ENUM ('RESIDENCIA', 'ESCOLA', 'OUTRO');

-- AlterTable
ALTER TABLE "student_address_overrides" ADD COLUMN     "horarioAlternativo" VARCHAR(5),
ADD COLUMN     "localTipo" "StudentAddressOverrideLocalTipo" NOT NULL DEFAULT 'OUTRO',
ALTER COLUMN "cep" DROP NOT NULL,
ALTER COLUMN "logradouro" DROP NOT NULL,
ALTER COLUMN "numero" DROP NOT NULL,
ALTER COLUMN "bairro" DROP NOT NULL,
ALTER COLUMN "cidade" DROP NOT NULL,
ALTER COLUMN "estado" DROP NOT NULL,
ALTER COLUMN "latitude" DROP NOT NULL,
ALTER COLUMN "longitude" DROP NOT NULL;

-- CreateTable
CREATE TABLE "student_address_override_recurrences" (
    "id" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "diasSemana" INTEGER[],
    "vigenciaInicio" DATE NOT NULL,
    "vigenciaFim" DATE,
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

    CONSTRAINT "student_address_override_recurrences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "student_address_override_recurrences_studentId_idx" ON "student_address_override_recurrences"("studentId");

-- AddForeignKey
ALTER TABLE "student_address_override_recurrences" ADD CONSTRAINT "student_address_override_recurrences_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_address_override_recurrences" ADD CONSTRAINT "student_address_override_recurrences_criadoPorUserId_fkey" FOREIGN KEY ("criadoPorUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

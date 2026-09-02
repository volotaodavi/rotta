-- CreateEnum
CREATE TYPE "CompanyJoinPreRegistrationStatus" AS ENUM ('PENDENTE', 'VINCULADO', 'CANCELADO');

-- AlterTable
ALTER TABLE "company_join_requests" ADD COLUMN     "preRegistrationId" UUID;

-- CreateTable
CREATE TABLE "company_join_pre_registrations" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "criadoPorId" UUID NOT NULL,
    "role" TEXT NOT NULL,
    "nome" TEXT,
    "celular" TEXT,
    "status" "CompanyJoinPreRegistrationStatus" NOT NULL DEFAULT 'PENDENTE',
    "vinculadoUserId" UUID,
    "vinculadoEm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_join_pre_registrations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "company_join_pre_registrations_companyId_status_idx" ON "company_join_pre_registrations"("companyId", "status");

-- CreateIndex
CREATE INDEX "company_join_pre_registrations_celular_idx" ON "company_join_pre_registrations"("celular");

-- AddForeignKey
ALTER TABLE "company_join_requests" ADD CONSTRAINT "company_join_requests_preRegistrationId_fkey" FOREIGN KEY ("preRegistrationId") REFERENCES "company_join_pre_registrations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_join_pre_registrations" ADD CONSTRAINT "company_join_pre_registrations_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_join_pre_registrations" ADD CONSTRAINT "company_join_pre_registrations_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_join_pre_registrations" ADD CONSTRAINT "company_join_pre_registrations_vinculadoUserId_fkey" FOREIGN KEY ("vinculadoUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- CreateEnum
CREATE TYPE "ClientApp" AS ENUM ('WEB', 'ADMIN', 'MOBILE');

-- DropForeignKey
ALTER TABLE "student_pre_registrations" DROP CONSTRAINT "student_pre_registrations_studentId_fkey";

-- CreateTable
CREATE TABLE "client_error_reports" (
    "id" UUID NOT NULL,
    "app" "ClientApp" NOT NULL,
    "message" TEXT NOT NULL,
    "digest" TEXT,
    "stack" TEXT,
    "path" TEXT NOT NULL,
    "userAgent" TEXT,
    "userId" UUID,
    "companyId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "client_error_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "client_error_reports_createdAt_idx" ON "client_error_reports"("createdAt");

-- CreateIndex
CREATE INDEX "client_error_reports_digest_idx" ON "client_error_reports"("digest");

-- AddForeignKey
ALTER TABLE "client_error_reports" ADD CONSTRAINT "client_error_reports_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_error_reports" ADD CONSTRAINT "client_error_reports_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

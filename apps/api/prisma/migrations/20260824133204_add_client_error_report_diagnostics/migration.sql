-- AlterTable
ALTER TABLE "client_error_reports" ADD COLUMN     "buildId" TEXT,
ADD COLUMN     "serviceWorkerActive" BOOLEAN,
ADD COLUMN     "source" TEXT;

-- CreateIndex
CREATE INDEX "client_error_reports_buildId_idx" ON "client_error_reports"("buildId");

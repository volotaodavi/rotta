-- AlterTable
ALTER TABLE "support_tickets" ADD COLUMN     "arquivado" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "arquivadoEm" TIMESTAMP(3),
ADD COLUMN     "protocolo" TEXT,
ADD COLUMN     "resumoIA" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "support_tickets_protocolo_key" ON "support_tickets"("protocolo");

-- CreateIndex
CREATE INDEX "support_tickets_companyId_arquivado_idx" ON "support_tickets"("companyId", "arquivado");


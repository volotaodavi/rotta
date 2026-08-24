-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationEventType" ADD VALUE 'TRIAL_EXPIRANDO';
ALTER TYPE "NotificationEventType" ADD VALUE 'TRIAL_VENCE_HOJE';
ALTER TYPE "NotificationEventType" ADD VALUE 'TRIAL_BLOQUEADO';

-- AlterTable
ALTER TABLE "companies" ADD COLUMN     "trialExpiraEm" TIMESTAMP(3);

-- Backfill: empresas já existentes em TRIAL nunca tiveram prazo nenhum
-- (o campo não existia) — vale a partir de agora "createdAt + 15 dias",
-- a mesma regra que CompaniesService.create() passa a aplicar em toda
-- empresa nova. Empresas que já não estão mais em TRIAL (ATIVO/SUSPENSO/
-- CANCELADO/INADIMPLENTE) ficam com trialExpiraEm nulo — o prazo só
-- importa enquanto o status ainda é TRIAL.
UPDATE "companies"
SET "trialExpiraEm" = "createdAt" + INTERVAL '15 days'
WHERE "status" = 'TRIAL' AND "trialExpiraEm" IS NULL;

-- CreateTable
CREATE TABLE "IdentityVerificationReview" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "status" "IdentityVerificationStatus" NOT NULL,
    "motivo" TEXT,
    "decisao" JSONB,
    "origem" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IdentityVerificationReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IdentityVerificationReview_userId_createdAt_idx" ON "IdentityVerificationReview"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "IdentityVerificationReview" ADD CONSTRAINT "IdentityVerificationReview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

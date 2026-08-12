-- Verificação de identidade hospedada via Didit (sessão v3) — cobre
-- Motorista e dono de Empresa/Gestor. `identityVerificationSessionId`
-- correlaciona o webhook (`vendor_data` = User.id, `session_id` da
-- sessão) de volta a este `User`; `identityVerificationDecisao` guarda
-- o `decision`/`resubmit_info` bruto do último evento aplicado, só para
-- auditoria.
-- CreateEnum
CREATE TYPE "IdentityVerificationStatus" AS ENUM ('NAO_INICIADA', 'EM_ANDAMENTO', 'EM_ANALISE', 'APROVADA', 'REPROVADA', 'EXPIRADA');

-- AlterTable
ALTER TABLE "users" ADD COLUMN "identityVerificationStatus" "IdentityVerificationStatus" NOT NULL DEFAULT 'NAO_INICIADA';
ALTER TABLE "users" ADD COLUMN "identityVerificationSessionId" TEXT;
ALTER TABLE "users" ADD COLUMN "identityVerifiedAt" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN "identityVerificationDecisao" JSONB;

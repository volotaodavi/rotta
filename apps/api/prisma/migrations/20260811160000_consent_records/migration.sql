-- Dossiê 45 FRENTE 5 — consentimento versionado (termos/privacidade),
-- lacuna já registrada no Dossiê 43 ("hoje só existe
-- consentimentoLgpdAceitoEm, um timestamp único, sem versão"). Cada
-- aceite grava uma nova linha em "consent_records" — histórico completo,
-- nunca sobrescrito.
CREATE TYPE "ConsentType" AS ENUM ('TERMOS_DE_USO', 'POLITICA_PRIVACIDADE');

CREATE TABLE "consent_records" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tipo" "ConsentType" NOT NULL,
    "versao" TEXT NOT NULL,
    "aceitoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consent_records_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "consent_records_userId_tipo_aceitoEm_idx" ON "consent_records"("userId", "tipo", "aceitoEm");

ALTER TABLE "consent_records" ADD CONSTRAINT "consent_records_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

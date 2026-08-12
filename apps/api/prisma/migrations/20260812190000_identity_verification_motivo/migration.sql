-- Motivo legível da verificação de identidade (extraído da decision da
-- Didit) — populado pelo webhook e pela sincronização manual do Admin
-- Rotta, para nunca deixar "reprovado, sem motivo" na tela.
-- AlterTable
ALTER TABLE "users" ADD COLUMN "identityVerificationMotivo" TEXT;

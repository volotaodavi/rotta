-- Dossie 43 (Identity & Access Engine) — MFA/2FA por TOTP, campos ja
-- previstos desde o Dossie 12 Secao 4.5 ("o schema de Usuario ja reserva
-- os campos... desde o MVP"). `totpSecretCriptografado` fica cifrado
-- (AES-256-GCM em nivel de aplicacao, SecretCipherService) — a coluna em
-- si e apenas TEXT, sem `pgcrypto`.
ALTER TABLE "users" ADD COLUMN "totpSecretCriptografado" TEXT;
ALTER TABLE "users" ADD COLUMN "totpHabilitado" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN "totpHabilitadoEm" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN "totpCodigosRecuperacaoHashes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

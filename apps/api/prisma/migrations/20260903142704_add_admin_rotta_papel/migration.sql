-- CreateEnum
CREATE TYPE "AdminRottaPapel" AS ENUM ('GERAL', 'SUPORTE', 'FINANCEIRO');

-- AlterTable
ALTER TABLE "users" ADD COLUMN "adminRottaPapel" "AdminRottaPapel" NOT NULL DEFAULT 'GERAL';

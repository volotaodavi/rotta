-- CreateEnum
CREATE TYPE "AnnouncementAudience" AS ENUM ('TODOS', 'EMPRESAS', 'MOTORISTAS_MONITORES', 'RESPONSAVEIS');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationEventType" ADD VALUE 'SUPORTE_TICKET_ABERTO';
ALTER TYPE "NotificationEventType" ADD VALUE 'SUPORTE_NOVA_MENSAGEM';
ALTER TYPE "NotificationEventType" ADD VALUE 'AVISO_GERAL';

-- CreateTable
CREATE TABLE "announcements" (
    "id" UUID NOT NULL,
    "titulo" TEXT NOT NULL,
    "corpo" TEXT NOT NULL,
    "publico" "AnnouncementAudience" NOT NULL,
    "criadoPorUserId" UUID NOT NULL,
    "destinatariosCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "announcements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "announcements_createdAt_idx" ON "announcements"("createdAt");

-- AddForeignKey
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_criadoPorUserId_fkey" FOREIGN KEY ("criadoPorUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

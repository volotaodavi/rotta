-- CreateEnum
CREATE TYPE "PendingSubscriptionStatus" AS ENUM ('PENDENTE', 'PAGO', 'VINCULADO', 'EXPIRADO', 'REEMBOLSADO');

-- CreateEnum
CREATE TYPE "PendingSubscriptionProvider" AS ENUM ('ABACATEPAY', 'ASAAS');

-- CreateTable
CREATE TABLE "pending_subscriptions" (
    "id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT,
    "cpfCnpj" TEXT,
    "telefone" TEXT,
    "planCode" TEXT NOT NULL DEFAULT 'STARTER',
    "valorCentavos" INTEGER NOT NULL,
    "provider" "PendingSubscriptionProvider" NOT NULL,
    "providerCheckoutId" TEXT NOT NULL,
    "providerCustomerId" TEXT,
    "providerSubscriptionId" TEXT,
    "status" "PendingSubscriptionStatus" NOT NULL DEFAULT 'PENDENTE',
    "paidAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "refundedAt" TIMESTAMP(3),
    "linkedCompanyId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pending_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pending_subscriptions_email_idx" ON "pending_subscriptions"("email");

-- CreateIndex
CREATE INDEX "pending_subscriptions_cpfCnpj_idx" ON "pending_subscriptions"("cpfCnpj");

-- CreateIndex
CREATE INDEX "pending_subscriptions_telefone_idx" ON "pending_subscriptions"("telefone");

-- CreateIndex
CREATE INDEX "pending_subscriptions_status_idx" ON "pending_subscriptions"("status");

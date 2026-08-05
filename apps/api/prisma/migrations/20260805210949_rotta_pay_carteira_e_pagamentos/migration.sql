-- CreateEnum
CREATE TYPE "WalletOwnerType" AS ENUM ('EMPRESA', 'MOTORISTA');

-- CreateEnum
CREATE TYPE "WalletTransactionType" AS ENUM ('CREDITO_MENSALIDADE', 'CREDITO_AJUSTE', 'DEBITO_SAQUE', 'DEBITO_TARIFA', 'CREDITO_ESTORNO', 'DEBITO_AJUSTE');

-- CreateEnum
CREATE TYPE "WalletTransactionStatus" AS ENUM ('PENDENTE', 'CONCLUIDA', 'FALHOU');

-- CreateEnum
CREATE TYPE "WithdrawalRequestStatus" AS ENUM ('SOLICITADO', 'EM_PROCESSAMENTO', 'CONCLUIDO', 'REJEITADO');

-- DropIndex
DROP INDEX "schools_ponto_geografico_gist_idx";

-- CreateTable
CREATE TABLE "wallets" (
    "id" UUID NOT NULL,
    "ownerType" "WalletOwnerType" NOT NULL,
    "companyId" UUID,
    "motoristaId" UUID,
    "saldoDisponivelCentavos" INTEGER NOT NULL DEFAULT 0,
    "saldoPendenteCentavos" INTEGER NOT NULL DEFAULT 0,
    "moeda" TEXT NOT NULL DEFAULT 'BRL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallet_transactions" (
    "id" UUID NOT NULL,
    "walletId" UUID NOT NULL,
    "tipo" "WalletTransactionType" NOT NULL,
    "status" "WalletTransactionStatus" NOT NULL DEFAULT 'CONCLUIDA',
    "valorCentavos" INTEGER NOT NULL,
    "saldoDisponivelAposCentavos" INTEGER NOT NULL,
    "descricao" TEXT NOT NULL,
    "contractId" UUID,
    "withdrawalRequestId" UUID,
    "criadaPorUserId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wallet_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "withdrawal_requests" (
    "id" UUID NOT NULL,
    "walletId" UUID NOT NULL,
    "valorCentavos" INTEGER NOT NULL,
    "chavePix" TEXT NOT NULL,
    "status" "WithdrawalRequestStatus" NOT NULL DEFAULT 'SOLICITADO',
    "solicitadoPorUserId" UUID NOT NULL,
    "providerReferencia" TEXT,
    "motivoRejeicao" TEXT,
    "processadoEm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "withdrawal_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "wallets_companyId_key" ON "wallets"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "wallets_motoristaId_key" ON "wallets"("motoristaId");

-- CreateIndex
CREATE INDEX "wallets_ownerType_idx" ON "wallets"("ownerType");

-- CreateIndex
CREATE UNIQUE INDEX "wallet_transactions_withdrawalRequestId_key" ON "wallet_transactions"("withdrawalRequestId");

-- CreateIndex
CREATE INDEX "wallet_transactions_walletId_createdAt_idx" ON "wallet_transactions"("walletId", "createdAt");

-- CreateIndex
CREATE INDEX "wallet_transactions_contractId_idx" ON "wallet_transactions"("contractId");

-- CreateIndex
CREATE INDEX "withdrawal_requests_walletId_status_idx" ON "withdrawal_requests"("walletId", "status");

-- AddForeignKey
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_motoristaId_fkey" FOREIGN KEY ("motoristaId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "wallets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_withdrawalRequestId_fkey" FOREIGN KEY ("withdrawalRequestId") REFERENCES "withdrawal_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_criadaPorUserId_fkey" FOREIGN KEY ("criadaPorUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "withdrawal_requests" ADD CONSTRAINT "withdrawal_requests_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "wallets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "withdrawal_requests" ADD CONSTRAINT "withdrawal_requests_solicitadoPorUserId_fkey" FOREIGN KEY ("solicitadoPorUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

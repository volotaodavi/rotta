import type {
  WalletResponseDto,
  WalletTransactionResponseDto,
  WithdrawalRequestResponseDto,
} from "../dto/wallet-response.dto";
import type { Wallet, WalletTransaction, WithdrawalRequest } from "@prisma/client";

export function toWalletResponseDto(wallet: Wallet): WalletResponseDto {
  return {
    id: wallet.id,
    ownerType: wallet.ownerType,
    companyId: wallet.companyId,
    motoristaId: wallet.motoristaId,
    saldoDisponivelCentavos: wallet.saldoDisponivelCentavos,
    saldoPendenteCentavos: wallet.saldoPendenteCentavos,
    moeda: wallet.moeda,
    createdAt: wallet.createdAt,
    updatedAt: wallet.updatedAt,
  };
}

export function toWalletTransactionResponseDto(
  transaction: WalletTransaction,
): WalletTransactionResponseDto {
  return {
    id: transaction.id,
    walletId: transaction.walletId,
    tipo: transaction.tipo,
    status: transaction.status,
    valorCentavos: transaction.valorCentavos,
    saldoDisponivelAposCentavos: transaction.saldoDisponivelAposCentavos,
    descricao: transaction.descricao,
    contractId: transaction.contractId,
    withdrawalRequestId: transaction.withdrawalRequestId,
    criadaPorUserId: transaction.criadaPorUserId,
    createdAt: transaction.createdAt,
  };
}

export function toWithdrawalRequestResponseDto(
  withdrawal: WithdrawalRequest,
): WithdrawalRequestResponseDto {
  return {
    id: withdrawal.id,
    walletId: withdrawal.walletId,
    valorCentavos: withdrawal.valorCentavos,
    chavePix: withdrawal.chavePix,
    status: withdrawal.status,
    solicitadoPorUserId: withdrawal.solicitadoPorUserId,
    providerReferencia: withdrawal.providerReferencia,
    motivoRejeicao: withdrawal.motivoRejeicao,
    processadoEm: withdrawal.processadoEm,
    createdAt: withdrawal.createdAt,
    updatedAt: withdrawal.updatedAt,
  };
}

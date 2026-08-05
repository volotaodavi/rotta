import { Injectable } from "@nestjs/common";


import type {
  ApplyWalletTransactionData,
  ListWalletTransactionsResult,
  UpdateWithdrawalRequestData,
  WalletOwnerRef,
  WalletRepository,
} from "./wallet.repository";
import type {
  Wallet,
  WalletTransaction,
  WalletTransactionStatus,
  WithdrawalRequest,
} from "@prisma/client";

import { PrismaService } from "@/infra/database/prisma.service";

@Injectable()
export class PrismaWalletRepository implements WalletRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string): Promise<Wallet | null> {
    return this.prisma.wallet.findUnique({ where: { id } });
  }

  findByCompanyId(companyId: string): Promise<Wallet | null> {
    return this.prisma.wallet.findUnique({ where: { companyId } });
  }

  findByMotoristaId(motoristaId: string): Promise<Wallet | null> {
    return this.prisma.wallet.findUnique({ where: { motoristaId } });
  }

  async getOrCreate(owner: WalletOwnerRef): Promise<Wallet> {
    const existing =
      owner.ownerType === "EMPRESA"
        ? await this.findByCompanyId(owner.companyId)
        : await this.findByMotoristaId(owner.motoristaId);
    if (existing) return existing;

    // `create` pode colidir em corrida rara (dois créditos simultâneos na
    // primeira movimentação da mesma carteira) — a unicidade de
    // `companyId`/`motoristaId` no banco garante que só uma vence; a
    // outra cai aqui e busca de novo.
    try {
      return await this.prisma.wallet.create({
        data:
          owner.ownerType === "EMPRESA"
            ? { ownerType: "EMPRESA", companyId: owner.companyId }
            : { ownerType: "MOTORISTA", motoristaId: owner.motoristaId },
      });
    } catch {
      const created =
        owner.ownerType === "EMPRESA"
          ? await this.findByCompanyId(owner.companyId)
          : await this.findByMotoristaId(owner.motoristaId);
      if (!created) throw new Error("Falha ao criar/recuperar a carteira Rotta Pay.");
      return created;
    }
  }

  async applyTransaction(
    walletId: string,
    data: ApplyWalletTransactionData,
  ): Promise<{ wallet: Wallet; transaction: WalletTransaction }> {
    return this.prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.update({
        where: { id: walletId },
        data: {
          saldoDisponivelCentavos: { increment: data.deltaSaldoDisponivelCentavos },
          saldoPendenteCentavos: { increment: data.deltaSaldoPendenteCentavos },
        },
      });
      const transaction = await tx.walletTransaction.create({
        data: {
          walletId,
          tipo: data.tipo,
          status: data.status ?? "CONCLUIDA",
          valorCentavos: data.valorCentavos,
          saldoDisponivelAposCentavos: wallet.saldoDisponivelCentavos,
          descricao: data.descricao,
          contractId: data.contractId,
          withdrawalRequestId: data.withdrawalRequestId,
          criadaPorUserId: data.criadaPorUserId,
        },
      });
      return { wallet, transaction };
    });
  }

  listTransactions(
    walletId: string,
    page: number,
    pageSize: number,
  ): Promise<ListWalletTransactionsResult> {
    return this.prisma
      .$transaction([
        this.prisma.walletTransaction.findMany({
          where: { walletId },
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        this.prisma.walletTransaction.count({ where: { walletId } }),
      ])
      .then(([items, total]) => ({ items, total }));
  }

  findTransactionById(id: string): Promise<WalletTransaction | null> {
    return this.prisma.walletTransaction.findUnique({ where: { id } });
  }

  findTransactionByWithdrawalRequestId(
    withdrawalRequestId: string,
  ): Promise<WalletTransaction | null> {
    return this.prisma.walletTransaction.findUnique({ where: { withdrawalRequestId } });
  }

  async transitionTransactionStatus(
    transactionId: string,
    status: WalletTransactionStatus,
    saldoDeltas: { deltaSaldoDisponivelCentavos: number; deltaSaldoPendenteCentavos: number },
  ): Promise<{ wallet: Wallet; transaction: WalletTransaction }> {
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.walletTransaction.findUniqueOrThrow({
        where: { id: transactionId },
      });
      const wallet = await tx.wallet.update({
        where: { id: current.walletId },
        data: {
          saldoDisponivelCentavos: { increment: saldoDeltas.deltaSaldoDisponivelCentavos },
          saldoPendenteCentavos: { increment: saldoDeltas.deltaSaldoPendenteCentavos },
        },
      });
      const transaction = await tx.walletTransaction.update({
        where: { id: transactionId },
        data: { status, saldoDisponivelAposCentavos: wallet.saldoDisponivelCentavos },
      });
      return { wallet, transaction };
    });
  }

  createWithdrawalRequest(data: {
    walletId: string;
    valorCentavos: number;
    chavePix: string;
    solicitadoPorUserId: string;
  }): Promise<WithdrawalRequest> {
    return this.prisma.withdrawalRequest.create({ data });
  }

  findWithdrawalRequestById(id: string): Promise<WithdrawalRequest | null> {
    return this.prisma.withdrawalRequest.findUnique({ where: { id } });
  }

  updateWithdrawalRequest(
    id: string,
    data: UpdateWithdrawalRequestData,
  ): Promise<WithdrawalRequest> {
    return this.prisma.withdrawalRequest.update({ where: { id }, data });
  }

  listWithdrawalRequests(walletId: string): Promise<WithdrawalRequest[]> {
    return this.prisma.withdrawalRequest.findMany({
      where: { walletId },
      orderBy: { createdAt: "desc" },
    });
  }
}

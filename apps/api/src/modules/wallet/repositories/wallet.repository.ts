import type {
  Wallet,
  WalletTransaction,
  WalletTransactionStatus,
  WalletTransactionType,
  WithdrawalRequest,
  WithdrawalRequestStatus,
} from "@prisma/client";

/** Referência polimórfica ao dono da carteira (Dossiê 26, Seção 3) — nunca as duas ao mesmo tempo. */
export type WalletOwnerRef =
  { ownerType: "EMPRESA"; companyId: string } | { ownerType: "MOTORISTA"; motoristaId: string };

/** Dados de uma nova linha do ledger — sempre INSERT, nunca UPDATE (Dossiê 26, Seção 3). */
export interface ApplyWalletTransactionData {
  tipo: WalletTransactionType;
  /** @default "CONCLUIDA" */
  status?: WalletTransactionStatus;
  valorCentavos: number;
  descricao: string;
  contractId?: string;
  withdrawalRequestId?: string;
  /** `undefined` = evento automático do sistema. */
  criadaPorUserId?: string;
  /** Delta aplicado a `saldoDisponivelCentavos` (positivo credita, negativo debita, 0 quando a transação só mexe no saldo pendente). */
  deltaSaldoDisponivelCentavos: number;
  /** Delta aplicado a `saldoPendenteCentavos`. */
  deltaSaldoPendenteCentavos: number;
}

export interface ListWalletTransactionsResult {
  items: WalletTransaction[];
  total: number;
}

export interface UpdateWithdrawalRequestData {
  status?: WithdrawalRequestStatus;
  motivoRejeicao?: string | null;
  processadoEm?: Date | null;
  providerReferencia?: string | null;
}

/**
 * Repository do módulo Rotta Pay (Dossiê 26) — a atomicidade
 * saldo+ledger (`applyTransaction`, `confirmTransaction`) vive aqui, não
 * no service: é fundamentalmente uma garantia de persistência (uma
 * `$transaction` do Prisma), mesma responsabilidade de qualquer outro
 * método de escrita deste repository, só que com mais de uma tabela
 * envolvida na mesma operação atômica.
 */
export interface WalletRepository {
  findById(id: string): Promise<Wallet | null>;
  findByCompanyId(companyId: string): Promise<Wallet | null>;
  findByMotoristaId(motoristaId: string): Promise<Wallet | null>;
  getOrCreate(owner: WalletOwnerRef): Promise<Wallet>;

  /** Insere uma linha no ledger e aplica os deltas de saldo atomicamente. */
  applyTransaction(
    walletId: string,
    data: ApplyWalletTransactionData,
  ): Promise<{ wallet: Wallet; transaction: WalletTransaction }>;

  listTransactions(
    walletId: string,
    page: number,
    pageSize: number,
  ): Promise<ListWalletTransactionsResult>;

  findTransactionById(id: string): Promise<WalletTransaction | null>;
  /** Cada `WithdrawalRequest` tem no máximo uma transação vinculada (`@unique`). */
  findTransactionByWithdrawalRequestId(
    withdrawalRequestId: string,
  ): Promise<WalletTransaction | null>;

  /**
   * Transição de status de UMA linha já existente do ledger (a única
   * mutação permitida sobre uma linha — `valorCentavos`/`tipo`/
   * `walletId` são imutáveis, ver Dossiê 26 Seção 3) — usada para
   * confirmar um crédito pendente ou liquidar/reverter um saque,
   * sempre junto do ajuste de saldo correspondente na mesma transação
   * de banco.
   */
  transitionTransactionStatus(
    transactionId: string,
    status: WalletTransactionStatus,
    saldoDeltas: { deltaSaldoDisponivelCentavos: number; deltaSaldoPendenteCentavos: number },
  ): Promise<{ wallet: Wallet; transaction: WalletTransaction }>;

  createWithdrawalRequest(data: {
    walletId: string;
    valorCentavos: number;
    chavePix: string;
    solicitadoPorUserId: string;
  }): Promise<WithdrawalRequest>;

  findWithdrawalRequestById(id: string): Promise<WithdrawalRequest | null>;
  updateWithdrawalRequest(
    id: string,
    data: UpdateWithdrawalRequestData,
  ): Promise<WithdrawalRequest>;
  listWithdrawalRequests(walletId: string): Promise<WithdrawalRequest[]>;
}

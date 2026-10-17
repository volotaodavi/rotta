import type { CompanyPaymentAccount, CompanyPaymentAccountStatus } from "@prisma/client";

export interface UpsertCompanyPaymentAccountData {
  status?: CompanyPaymentAccountStatus;
  asaasWalletId?: string | null;
  chavePix?: string | null;
  taxaDaPlataformaBps?: number;
  observacoes?: string | null;
}

/** `company_payment_accounts` tem RLS por `companyId`, uma linha por transportadora (`@unique`). */
export interface CompanyPaymentAccountRepository {
  findByCompanyId(companyId: string): Promise<CompanyPaymentAccount | null>;
  upsert(companyId: string, data: UpsertCompanyPaymentAccountData): Promise<CompanyPaymentAccount>;
  /**
   * A conta de recebimento vista de fora do tenant — usada pelo
   * processamento do webhook da Asaas, que chega sem ator (quem fala é
   * o provedor). O `companyId` vem da fatura já encontrada pelo
   * `asaasPaymentId`, nunca do corpo da requisição.
   */
  findByCompanyIdAcrossTenants(companyId: string): Promise<CompanyPaymentAccount | null>;
}

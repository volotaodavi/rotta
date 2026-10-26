import type {
  CompanyPaymentAccount,
  CompanyPaymentAccountStatus,
  EmissorDaCobranca,
  PagadorDaTarifaDeCustodia,
} from "@prisma/client";

export interface UpsertCompanyPaymentAccountData {
  status?: CompanyPaymentAccountStatus;
  /**
   * A subconta na Lytex, o estabelecimento que o split endereça, e se o
   * split dela já foi liberado.
   *
   * Nenhuma rota deixa o transportador escrever estes três campos: quem
   * pudesse escrever o próprio `lytexRecipientId` redirecionaria o split
   * de qualquer cobrança.
   */
  lytexSubAccountId?: string | null;
  lytexRecipientId?: string | null;
  lytexSplitLiberado?: boolean;
  chavePix?: string | null;
  taxaDaPlataformaBps?: number;
  observacoes?: string | null;

  /**
   * Os controles que o Admin Rotta opera
   * (`FamilyBillingService.configurarRecebimentoDaEmpresa`).
   *
   * Até 21/10/2026 eles eram somente lidos: nasciam no padrão da
   * migration e nenhum caminho os escrevia, então ligar uma
   * transportadora por vez só dava com SQL direto no banco.
   *
   * Nenhuma rota deixa a própria transportadora escrever estes campos.
   * Taxa é decisão de preço, o emissor decide quem responde por
   * chargeback de até 540 dias, e a custódia tem tarifa recorrente por
   * subconta ligada — nada disso é escolha de quem é cobrado por elas.
   */
  taxaPixBps?: number;
  taxaBoletoBps?: number;
  taxaCreditoVistaBps?: number;
  taxaCreditoParceladoBps?: number;
  emissorDaCobranca?: EmissorDaCobranca;
  custodiaAtiva?: boolean;
  custodiaDiasParaLiberar?: number | null;
  custodiaTarifaPagaPor?: PagadorDaTarifaDeCustodia;
}

/** `company_payment_accounts` tem RLS por `companyId`, uma linha por transportadora (`@unique`). */
export interface CompanyPaymentAccountRepository {
  findByCompanyId(companyId: string): Promise<CompanyPaymentAccount | null>;
  upsert(companyId: string, data: UpsertCompanyPaymentAccountData): Promise<CompanyPaymentAccount>;
  /**
   * A conta de recebimento vista de fora do tenant — usada pelo
   * processamento do webhook da Lytex, que chega sem ator (quem fala é
   * o provedor). O `companyId` vem da fatura já encontrada pelo
   * `lytexInvoiceId`, nunca do corpo da requisição.
   */
  findByCompanyIdAcrossTenants(companyId: string): Promise<CompanyPaymentAccount | null>;
  /**
   * Grava fora do tenant: para quando a escrita nasce de um webhook, que
   * chega sem ator nenhum e por isso não tem o contexto de tenant que o
   * `upsert` normal exige.
   *
   * O Admin Rotta NÃO passa por aqui, mesmo criando a subconta pela
   * transportadora: `TenantGuard` já publica `bypass: true` para
   * `ADMIN_ROTTA`, então o `upsert` normal o atende, e a diferença entre
   * os dois métodos continua sendo "tem requisição" contra "não tem".
   *
   * O `companyId` nunca vem do corpo da requisição: vem da conta já
   * encontrada pela fatura que o provedor citou.
   */
  upsertAcrossTenants(
    companyId: string,
    data: UpsertCompanyPaymentAccountData,
  ): Promise<CompanyPaymentAccount>;
}

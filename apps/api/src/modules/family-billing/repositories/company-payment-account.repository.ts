import type {
  CompanyPaymentAccount,
  CompanyPaymentAccountStatus,
  EmissorDaCobranca,
  PagadorDaTarifaDeCustodia,
} from "@prisma/client";

export interface UpsertCompanyPaymentAccountData {
  status?: CompanyPaymentAccountStatus;
  asaasWalletId?: string | null;
  asaasAccountId?: string | null;
  /**
   * A chave de API da subconta, JÁ CIFRADA.
   *
   * Entra por aqui porque é gravada na mesma operação que cria a
   * subconta: a Asaas só exibe a chave na resposta da criação, e não há
   * endpoint para pedir de novo. Nenhuma rota deixa o transportador
   * escrever este campo.
   */
  asaasApiKeyCifrada?: string | null;
  asaasOnboardingUrl?: string | null;
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
   * processamento do webhook da Asaas, que chega sem ator (quem fala é
   * o provedor). O `companyId` vem da fatura já encontrada pelo
   * `asaasPaymentId`, nunca do corpo da requisição.
   */
  findByCompanyIdAcrossTenants(companyId: string): Promise<CompanyPaymentAccount | null>;
  /**
   * A conta de recebimento encontrada pela subconta do Asaas, fora do
   * tenant — usada pelo webhook de situação da conta, que chega sem ator
   * e sem `companyId`: o único identificador que ele traz é o `id` da
   * subconta.
   */
  findByAsaasAccountIdAcrossTenants(asaasAccountId: string): Promise<CompanyPaymentAccount | null>;
  /**
   * Grava fora do tenant — um chamador só: o webhook de situação da
   * conta, que chega sem ator nenhum e por isso não tem o contexto de
   * tenant que o `upsert` normal exige.
   *
   * O Admin Rotta NÃO passa por aqui, mesmo criando a subconta pela
   * transportadora: `TenantGuard` já publica `bypass: true` para
   * `ADMIN_ROTTA`, então o `upsert` normal o atende, e a diferença entre
   * os dois métodos continua sendo "tem requisição" contra "não tem".
   *
   * O `companyId` nunca vem do corpo da requisição: vem da conta
   * encontrada pelo `asaasAccountId`.
   */
  upsertAcrossTenants(
    companyId: string,
    data: UpsertCompanyPaymentAccountData,
  ): Promise<CompanyPaymentAccount>;
}

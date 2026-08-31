import type { ApiClient } from "../http";

/**
 * Endpoints tipados do módulo Billing (Dossiê 26) — espelham
 * `apps/api/src/modules/billing`. Cobra a mensalidade da PLATAFORMA
 * (R$ 39,90/mês) das empresas/transportadoras/autônomos — Pix via
 * AbacatePay, cartão/débito/boleto via Asaas — nunca o Responsável,
 * que é 100% gratuito e não tem plano.
 */

/**
 * Cobrança Pix embutida — não tem `url` nenhuma pra abrir: o QR Code
 * (`brCodeBase64`) e o código copia-e-cola (`brCode`) já vêm prontos
 * pra renderizar direto na Rotta (`PixCheckoutModal`, `apps/web`).
 */
export interface PixCheckout {
  id: string;
  amount: number;
  status: "PENDING" | "EXPIRED" | "CANCELLED" | "PAID" | "REFUNDED";
  brCode: string;
  brCodeBase64: string;
  expiresAt: string;
}

export interface BillingAdminCompanySummary {
  id: string;
  nomeFantasia: string;
  razaoSocial: string;
  planoNome: string;
  abacatepaySubscriptionId: string | null;
  asaasSubscriptionId: string | null;
  ativaDesde: string;
}

export interface BillingAdminPlanSummary {
  codigo: string;
  nome: string;
  quantidadeEmpresas: number;
}

/** Bloco de valores de UM provedor (AbacatePay ou Asaas) — mesmo formato pros dois no painel financeiro do Admin. */
export interface BillingProviderOverview {
  configured: boolean;
  totalRecebidoCentavos: number | null;
  totalTaxaRetidaCentavos: number | null;
  quantidadeCobrancasPagas: number | null;
}

export interface BillingAdminOverview {
  /** `false` = AbacatePay não configurada nesta implantação — os campos de valores/taxa abaixo vêm `null`. */
  abacatepayConfigured: boolean;
  quantidadeEmpresasAtivas: number;
  planos: BillingAdminPlanSummary[];
  empresasAtivas: BillingAdminCompanySummary[];
  totalRecebidoCentavos: number | null;
  totalTaxaRetidaCentavos: number | null;
  quantidadeCobrancasPagas: number | null;
  /** AbacatePay (Pix) e Asaas (cartão/débito/boleto) lado a lado. */
  abacatepay: BillingProviderOverview;
  asaas: BillingProviderOverview;
  /** Recebido menos taxa retida dos dois provedores — `null` se nenhum estiver configurado. */
  lucroLiquidoCentavos: number | null;
}

export type AsaasBillingType = "CREDIT_CARD" | "DEBIT_CARD" | "BOLETO";

export interface CreateAsaasCheckoutInput {
  billingType: AsaasBillingType;
  cartao?: {
    holderName: string;
    number: string;
    expiryMonth: string;
    expiryYear: string;
    ccv: string;
  };
  titular?: {
    name: string;
    email: string;
    cpfCnpj: string;
    postalCode: string;
    addressNumber: string;
    phone?: string;
  };
}

/**
 * Primeiro pagamento gerado pela assinatura Asaas — boleto vem com
 * `identificationField` (linha digitável) + `bankSlipUrl` (PDF); cartão
 * confirma via `status` (poll com `getAsaasCheckoutStatus`, mesmo papel
 * de `getPixCheckoutStatus`).
 */
export interface AsaasPayment {
  id: string;
  status:
    | "PENDING"
    | "RECEIVED"
    | "CONFIRMED"
    | "OVERDUE"
    | "REFUNDED"
    | "RECEIVED_IN_CASH"
    | "CHARGEBACK_REQUESTED";
  billingType: AsaasBillingType;
  value: number;
  identificationField?: string;
  bankSlipUrl?: string;
  invoiceUrl?: string;
}

interface ApiEnvelope<T> {
  data: T;
}

/**
 * Segunda forma de assinar (Dossiê 26, pedido do usuário 31/08/2026) —
 * pagar ANTES de ter conta. `email`/`cpfCnpj`/`telefone` são opcionais
 * entre si no Pix (pelo menos 1), mas SEMPRE obrigatórios no Asaas
 * (`CreatePreSignupAsaasInput` abaixo) — restrição da própria Asaas, não
 * da Rotta (ver `apps/api/.../create-pre-signup-checkout.dto.ts`).
 */
export interface CreatePreSignupPixInput {
  nome: string;
  email?: string;
  cpfCnpj?: string;
  telefone?: string;
}

export interface CreatePreSignupAsaasInput {
  nome: string;
  email: string;
  cpfCnpj: string;
  telefone?: string;
  billingType: AsaasBillingType;
  cartao?: CreateAsaasCheckoutInput["cartao"];
  titular?: CreateAsaasCheckoutInput["titular"];
}

export interface PreSignupCheckoutResult<T> {
  pendingId: string;
  expiresAt: string;
  checkout?: T;
  payment?: T;
}

export type PendingSubscriptionStatus =
  "PENDENTE" | "PAGO" | "VINCULADO" | "EXPIRADO" | "REEMBOLSADO";

export interface PreSignupStatus {
  status: PendingSubscriptionStatus;
  paidAt: string | null;
  expiresAt: string;
  linkedCompanyId: string | null;
}

export function createBillingEndpoints(apiClient: ApiClient) {
  return {
    createPixCheckout: async (): Promise<PixCheckout> =>
      (
        await apiClient.request<ApiEnvelope<PixCheckout>>("/billing/checkout/pix", {
          method: "POST",
        })
      ).data,

    getPixCheckoutStatus: async (id: string): Promise<PixCheckout> =>
      (await apiClient.request<ApiEnvelope<PixCheckout>>(`/billing/checkout/pix/${id}/status`))
        .data,

    getAdminOverview: async (): Promise<BillingAdminOverview> =>
      (await apiClient.request<ApiEnvelope<BillingAdminOverview>>("/billing/admin/overview")).data,

    /** Checkout próprio da Rotta pra cartão/débito/boleto — processado pela Asaas por trás, sem sair da Rotta. */
    createAsaasCheckout: async (input: CreateAsaasCheckoutInput): Promise<AsaasPayment> =>
      (
        await apiClient.request<ApiEnvelope<AsaasPayment>>("/billing/asaas/checkout", {
          method: "POST",
          body: input,
        })
      ).data,

    getAsaasCheckoutStatus: async (id: string): Promise<AsaasPayment> =>
      (await apiClient.request<ApiEnvelope<AsaasPayment>>(`/billing/asaas/checkout/${id}/status`))
        .data,

    /** Sem sessão nenhuma — endpoint público (`/planos/assinar`, pagar antes de ter conta). */
    createPreSignupPixCheckout: async (
      input: CreatePreSignupPixInput,
    ): Promise<PreSignupCheckoutResult<PixCheckout>> =>
      (
        await apiClient.request<ApiEnvelope<PreSignupCheckoutResult<PixCheckout>>>(
          "/billing/pre-signup/pix",
          { method: "POST", body: input },
        )
      ).data,

    /** Mesmo raciocínio de `createPreSignupPixCheckout`, cartão/débito/boleto via Asaas. */
    createPreSignupAsaasCheckout: async (
      input: CreatePreSignupAsaasInput,
    ): Promise<PreSignupCheckoutResult<AsaasPayment>> =>
      (
        await apiClient.request<ApiEnvelope<PreSignupCheckoutResult<AsaasPayment>>>(
          "/billing/pre-signup/asaas",
          { method: "POST", body: input },
        )
      ).data,

    /** Polling da tela pública enquanto aguarda o webhook confirmar. */
    getPreSignupStatus: async (pendingId: string): Promise<PreSignupStatus> =>
      (
        await apiClient.request<ApiEnvelope<PreSignupStatus>>(
          `/billing/pre-signup/${pendingId}/status`,
        )
      ).data,
  };
}

export type BillingEndpoints = ReturnType<typeof createBillingEndpoints>;

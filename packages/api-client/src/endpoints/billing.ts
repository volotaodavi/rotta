import type { ApiClient } from "../http";

/**
 * Endpoints tipados do módulo Billing (Dossiê 26) — espelham
 * `apps/api/src/modules/billing`. Cobra a mensalidade da PLATAFORMA
 * (R$ 39,90/mês) das empresas/transportadoras/autônomos via AbacatePay
 * — nunca o Responsável, que é 100% gratuito e não tem plano.
 */

export interface CreateCheckoutInput {
  /** URL da própria Rotta para onde a AbacatePay redireciona ao concluir/cancelar — nunca um domínio de terceiro. */
  returnUrl: string;
}

export interface CreateCheckoutResult {
  /** Página hospedada da AbacatePay onde o pagamento é concluído (fora do domínio da Rotta — ver `TrialBanner`). */
  url: string;
  checkoutId: string;
}

/**
 * Cobrança Pix embutida — ao contrário de `CreateCheckoutResult`, não
 * tem `url` nenhuma pra abrir: o QR Code (`brCodeBase64`) e o código
 * copia-e-cola (`brCode`) já vêm prontos pra renderizar direto na Rotta
 * (`PixCheckoutModal`, `apps/web`).
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
  ativaDesde: string;
}

export interface BillingAdminPlanSummary {
  codigo: string;
  nome: string;
  quantidadeEmpresas: number;
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
}

interface ApiEnvelope<T> {
  data: T;
}

export function createBillingEndpoints(apiClient: ApiClient) {
  return {
    createCheckout: async (input: CreateCheckoutInput): Promise<CreateCheckoutResult> =>
      (
        await apiClient.request<ApiEnvelope<CreateCheckoutResult>>("/billing/checkout", {
          method: "POST",
          body: input,
        })
      ).data,

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
  };
}

export type BillingEndpoints = ReturnType<typeof createBillingEndpoints>;

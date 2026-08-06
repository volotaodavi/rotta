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
  };
}

export type BillingEndpoints = ReturnType<typeof createBillingEndpoints>;

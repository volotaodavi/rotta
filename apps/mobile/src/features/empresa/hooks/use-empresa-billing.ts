import { useQuery } from "@tanstack/react-query";

import { billingApi } from "@/lib/api-client";

/**
 * Histórico de pagamentos da própria empresa (`GET
 * /billing/company/payments`) — endpoint novo (15/09/2026), escopado
 * pelo `tenantId` do token no backend.
 *
 * O extrato que já existia (`getCompanyPaymentHistory`) é de ADMIN
 * (`Role.ADMIN_ROTTA` + área FINANCEIRO, pra suporte financeiro olhar a
 * conta de um cliente): um Gestor chamando aquela rota tomaria 403, por
 * isso não dava pra reaproveitá-la aqui.
 */
export function useMyCompanyPayments() {
  return useQuery({
    queryKey: ["empresa", "billing", "payments"],
    queryFn: () => billingApi.getMyCompanyPaymentHistory(),
  });
}

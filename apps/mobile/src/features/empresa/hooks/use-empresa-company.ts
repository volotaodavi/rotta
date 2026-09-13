import { useQuery } from "@tanstack/react-query";

import { companiesApi } from "@/lib/api-client";

/**
 * Dados da própria empresa (Empresa/Gestor) — mirror de
 * `apps/web/src/features/company/hooks/use-company.ts#useMyCompany`.
 * Só `company.status`/`trialExpiraEm` são consumidos por enquanto
 * (banner de trial vencendo, `TrialBanner`); se mais telas precisarem
 * de outros campos da empresa, é este o hook a estender — não duplicar.
 */
export function useMyCompany(companyId: string | null | undefined) {
  return useQuery({
    queryKey: ["empresa", "my-company", companyId],
    queryFn: () => companiesApi.getById(companyId as string),
    enabled: Boolean(companyId),
  });
}

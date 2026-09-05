import { useQuery } from "@tanstack/react-query";

import { backofficeApi } from "@/lib/api-client";

/**
 * Hooks de dados da área Admin reduzida no app (pedido do usuário
 * 05/09/2026) — mesmos endpoints exclusivos de `Role.ADMIN_ROTTA` já
 * usados por `apps/admin/src/features/backoffice/hooks/use-backoffice.ts`,
 * mesmo `refetchInterval` (números "de saúde da plataforma" atualizam
 * sozinhos, sem exigir um "puxar pra atualizar" manual aqui também).
 */
export function useAdminBackofficeDashboard() {
  return useQuery({
    queryKey: ["admin", "backoffice", "dashboard"],
    queryFn: () => backofficeApi.getDashboard(),
    refetchInterval: 60_000,
  });
}

export function useAdminApprovalQueue(limit = 20) {
  return useQuery({
    queryKey: ["admin", "backoffice", "approvals", limit],
    queryFn: () => backofficeApi.listApprovals(limit),
    refetchInterval: 60_000,
  });
}

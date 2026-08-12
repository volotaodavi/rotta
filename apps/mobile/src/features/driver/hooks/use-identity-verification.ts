import { useQuery } from "@tanstack/react-query";

import { identityVerificationApi } from "@/lib/api-client";

/**
 * Status da verificação de identidade do Motorista/Monitor logado —
 * consultado pelo `RootNavigator` (Frente J) para o bloqueio total
 * quando `status === "REPROVADA"`, mesmo raciocínio de
 * `(dashboard)/layout.tsx` em apps/web. `enabled` default `true` — quem
 * chama passa `false` fora do papel Motorista/Monitor (o backend nem
 * aceita este endpoint pra outros papéis).
 */
export function useMyIdentityVerification(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["identity-verification", "me"],
    queryFn: () => identityVerificationApi.getMyStatus(),
    enabled: options?.enabled ?? true,
  });
}

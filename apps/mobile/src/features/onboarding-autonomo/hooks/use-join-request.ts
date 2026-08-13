import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { companyJoinRequestsApi } from "@/lib/api-client";

const JOIN_REQUEST_QUERY_KEY = ["company-join-requests", "me"];

/**
 * "Meu pedido de vínculo" (Frente N, briefing item 9) — status do
 * último pedido que o Motorista/Monitor autônomo fez (`PENDENTE`,
 * `APROVADO`ou `RECUSADO`), ou `null` se nunca pediu nenhum. Consultado
 * pela `VinculoPendenteStatusScreen` (`RootNavigator` mostra essa stack
 * inteira só quando `user.companyId` ainda é `null`).
 */
export function useMyJoinRequest() {
  return useQuery({
    queryKey: JOIN_REQUEST_QUERY_KEY,
    queryFn: () => companyJoinRequestsApi.findMine(),
  });
}

export function useCreateJoinRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (codigoInterno: string) => companyJoinRequestsApi.create(codigoInterno),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: JOIN_REQUEST_QUERY_KEY });
    },
  });
}

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { marketplaceApi } from "@/lib/api-client";

/** Hooks de contrato do Responsável (briefing "CONTRATO"/"TRANSPORTE ATIVO"). */
export function useContracts() {
  return useQuery({
    queryKey: ["marketplace", "contracts"],
    queryFn: () => marketplaceApi.listContracts({ pageSize: 50 }),
  });
}

export function useContract(id: string | undefined) {
  return useQuery({
    queryKey: ["marketplace", "contracts", id],
    queryFn: () => marketplaceApi.getContractById(id as string),
    enabled: Boolean(id),
  });
}

export function useAssinarContratoComoResponsavel(id: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => marketplaceApi.assinarContratoComoResponsavel(id as string),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["marketplace", "contracts"] });
    },
  });
}

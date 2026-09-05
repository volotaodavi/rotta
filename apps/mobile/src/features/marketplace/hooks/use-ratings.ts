import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { CreateRatingInput } from "@rotta/api-client";

import { marketplaceApi } from "@/lib/api-client";

/** Hooks de avaliação pós-transporte (briefing "AVALIAÇÕES" — liberada 30 dias após a ativação). */
export function useRatings(contractId: string | undefined) {
  return useQuery({
    queryKey: ["marketplace", "contracts", contractId, "ratings"],
    queryFn: () => marketplaceApi.listRatings(contractId as string),
    enabled: Boolean(contractId),
  });
}

export function useCreateRating(contractId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateRatingInput) =>
      marketplaceApi.createRating(contractId as string, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["marketplace", "contracts", contractId, "ratings"],
      });
    },
  });
}

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { CreateTransportRequestInput } from "@rotta/api-client";

import { marketplaceApi } from "@/lib/api-client";

/** Hooks de solicitação de transporte do Responsável (briefing "SOLICITAR TRANSPORTE"/"SOLICITAÇÃO"). */
export function useTransportRequests() {
  return useQuery({
    queryKey: ["marketplace", "transport-requests"],
    queryFn: () => marketplaceApi.listTransportRequests({ pageSize: 50 }),
  });
}

export function useTransportRequest(id: string | undefined) {
  return useQuery({
    queryKey: ["marketplace", "transport-requests", id],
    queryFn: () => marketplaceApi.getTransportRequestById(id as string),
    enabled: Boolean(id),
  });
}

export function useCreateTransportRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTransportRequestInput) =>
      marketplaceApi.createTransportRequest(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["marketplace", "transport-requests"] });
    },
  });
}

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type {
  CreateContractInput,
  ListContractsParams,
  ListTransportRequestsParams,
} from "@rotta/api-client";

import { marketplaceApi } from "@/lib/api-client";

/**
 * Hooks de Marketplace pro lado da Empresa/Gestor (Frente A do plano
 * "lacunas Empresa/Gestor no app" — pedido do usuário 12/09/2026: "o
 * app é o principal... pegue as soluções, pegue os quesitos") — mesmos
 * endpoints já usados por
 * `apps/web/src/features/marketplace/hooks/use-marketplace.ts`
 * (solicitações recebidas de famílias + contratos gerados a partir
 * delas). Antes desta Frente, o app não tinha NENHUMA tela de
 * Marketplace pro dono/gestor — uma solicitação só era vista abrindo a
 * Web.
 *
 * Prefixo `"empresa"` nas chaves (mesmo padrão de `use-empresa-vehicles.ts`/
 * `use-empresa-team.ts`) — nunca reaproveita as chaves do lado
 * Responsável (`features/marketplace/hooks/*`, escopo de UM
 * responsável/aluno, formato de dado diferente).
 */
const TRANSPORT_REQUESTS_QUERY_KEY = ["empresa", "marketplace", "transport-requests"] as const;
const CONTRACTS_QUERY_KEY = ["empresa", "marketplace", "contracts"] as const;

export function useTransportRequestsList(params: ListTransportRequestsParams = {}) {
  return useQuery({
    queryKey: [...TRANSPORT_REQUESTS_QUERY_KEY, "list", params],
    queryFn: () => marketplaceApi.listTransportRequests(params),
  });
}

export function useTransportRequest(id: string | undefined) {
  return useQuery({
    queryKey: [...TRANSPORT_REQUESTS_QUERY_KEY, id],
    queryFn: () => marketplaceApi.getTransportRequestById(id as string),
    enabled: Boolean(id),
  });
}

export function useMarcarTransportRequestEmAnalise(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => marketplaceApi.marcarTransportRequestEmAnalise(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: TRANSPORT_REQUESTS_QUERY_KEY });
    },
  });
}

export function useAprovarTransportRequest(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => marketplaceApi.aprovarTransportRequest(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: TRANSPORT_REQUESTS_QUERY_KEY });
    },
  });
}

export function useRecusarTransportRequest(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (motivoRecusa: string) => marketplaceApi.recusarTransportRequest(id, motivoRecusa),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: TRANSPORT_REQUESTS_QUERY_KEY });
    },
  });
}

export function useGerarContrato(transportRequestId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateContractInput) =>
      marketplaceApi.gerarContrato(transportRequestId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: TRANSPORT_REQUESTS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: CONTRACTS_QUERY_KEY });
    },
  });
}

export function useContractsList(params: ListContractsParams = { pageSize: 100 }) {
  return useQuery({
    queryKey: [...CONTRACTS_QUERY_KEY, "list", params],
    queryFn: () => marketplaceApi.listContracts(params),
  });
}

export function useContract(id: string | undefined) {
  return useQuery({
    queryKey: [...CONTRACTS_QUERY_KEY, id],
    queryFn: () => marketplaceApi.getContractById(id as string),
    enabled: Boolean(id),
  });
}

export function useAssinarContratoComoEmpresa(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => marketplaceApi.assinarContratoComoEmpresa(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [...CONTRACTS_QUERY_KEY, id] });
      void queryClient.invalidateQueries({ queryKey: CONTRACTS_QUERY_KEY });
    },
  });
}

export function useContractRatings(contractId: string | undefined) {
  return useQuery({
    queryKey: [...CONTRACTS_QUERY_KEY, contractId, "ratings"],
    queryFn: () => marketplaceApi.listRatings(contractId as string),
    enabled: Boolean(contractId),
  });
}

"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type {
  CreateContractInput,
  ListContractsParams,
  ListTransportRequestsParams,
} from "@rotta/api-client";

import { marketplaceApi } from "@/lib/api-client";

/**
 * Hooks de dados do módulo Marketplace (Painel Web — Empresa/Gestor
 * gerenciando solicitações de transporte e contratos), mesmo padrão de
 * `use-vehicles.ts`: um único arquivo para todo o domínio.
 */
export function useTransportRequestsList(params: ListTransportRequestsParams) {
  return useQuery({
    queryKey: ["marketplace", "transport-requests", params],
    queryFn: () => marketplaceApi.listTransportRequests(params),
  });
}

export function useTransportRequest(id: string) {
  return useQuery({
    queryKey: ["marketplace", "transport-requests", id],
    queryFn: () => marketplaceApi.getTransportRequestById(id),
    enabled: Boolean(id),
  });
}

export function useMarcarTransportRequestEmAnalise(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => marketplaceApi.marcarTransportRequestEmAnalise(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["marketplace", "transport-requests"] });
    },
  });
}

export function useAprovarTransportRequest(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => marketplaceApi.aprovarTransportRequest(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["marketplace", "transport-requests"] });
    },
  });
}

export function useRecusarTransportRequest(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (motivoRecusa: string) => marketplaceApi.recusarTransportRequest(id, motivoRecusa),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["marketplace", "transport-requests"] });
    },
  });
}

export function useGerarContrato(transportRequestId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateContractInput) =>
      marketplaceApi.gerarContrato(transportRequestId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["marketplace", "transport-requests"] });
      void queryClient.invalidateQueries({ queryKey: ["marketplace", "contracts"] });
    },
  });
}

export function useContractsList(params: ListContractsParams) {
  return useQuery({
    queryKey: ["marketplace", "contracts", params],
    queryFn: () => marketplaceApi.listContracts(params),
  });
}

export function useContract(id: string) {
  return useQuery({
    queryKey: ["marketplace", "contracts", id],
    queryFn: () => marketplaceApi.getContractById(id),
    enabled: Boolean(id),
  });
}

export function useAssinarContratoComoEmpresa(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => marketplaceApi.assinarContratoComoEmpresa(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["marketplace", "contracts", id] });
      void queryClient.invalidateQueries({ queryKey: ["marketplace", "contracts"] });
    },
  });
}

export function useContractRatings(contractId: string) {
  return useQuery({
    queryKey: ["marketplace", "contracts", contractId, "ratings"],
    queryFn: () => marketplaceApi.listRatings(contractId),
    enabled: Boolean(contractId),
  });
}

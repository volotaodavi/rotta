"use client";

import { useQuery } from "@tanstack/react-query";

import type { ListContractsParams, ListTransportRequestsParams } from "@rotta/api-client";

import { marketplaceApi } from "@/lib/api-client";

/**
 * Hooks de dados do módulo Marketplace (visão CROSS-TENANT do Admin
 * Rotta) — apenas leitura, mesmo padrão de `use-vehicles.ts`: o Admin
 * Rotta observa solicitações/contratos de todas as empresas, mas quem
 * decide (aprovar/recusar/gerar contrato/assinar) é sempre a própria
 * Empresa/Gestor dona do recurso.
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

export function useContractRatings(contractId: string) {
  return useQuery({
    queryKey: ["marketplace", "contracts", contractId, "ratings"],
    queryFn: () => marketplaceApi.listRatings(contractId),
    enabled: Boolean(contractId),
  });
}

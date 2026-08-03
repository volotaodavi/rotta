import { useMemo } from "react";

import { useContracts } from "./use-contracts";
import { useTransportRequests } from "./use-transport-requests";

import type { Contract, TransportRequest } from "@rotta/api-client";

/**
 * Os cinco estados mutuamente exclusivos do Responsável (briefing
 * "Marketplace" — a aba "Transporte" do Bottom Navigation muda de nome
 * conforme este estado). Prioridade de cálculo, da mais "avançada" para
 * a mais "inicial": um Contrato `ATIVO` sempre vence qualquer
 * solicitação/contrato antigo do mesmo Responsável (ex. já teve um
 * contrato `ENCERRADO` antes e contratou de novo).
 */
export type ResponsavelTransportState =
  | "SEM_TRANSPORTE"
  | "SOLICITACAO_PENDENTE"
  | "AGUARDANDO_CONTRATO"
  | "TRANSPORTE_ATIVO"
  | "CONTRATO_ENCERRADO";

export interface TransportStateResult {
  isLoading: boolean;
  state: ResponsavelTransportState;
  contratoAtivo: Contract | null;
  ultimoContrato: Contract | null;
  solicitacoesPendentes: TransportRequest[];
  solicitacaoAprovadaSemContrato: TransportRequest | null;
}

function computeState(
  requests: TransportRequest[],
  contracts: Contract[],
): Omit<TransportStateResult, "isLoading"> {
  const contratoAtivo = contracts.find((c) => c.status === "ATIVO") ?? null;
  if (contratoAtivo) {
    return {
      state: "TRANSPORTE_ATIVO",
      contratoAtivo,
      ultimoContrato: contratoAtivo,
      solicitacoesPendentes: [],
      solicitacaoAprovadaSemContrato: null,
    };
  }

  const contratoAguardandoAssinatura =
    contracts.find((c) => c.status === "AGUARDANDO_ASSINATURA") ?? null;

  const solicitacoesPendentes = requests.filter(
    (r) => r.status === "RECEBIDA" || r.status === "EM_ANALISE",
  );
  const solicitacaoAprovadaSemContrato = contratoAguardandoAssinatura
    ? null
    : (requests.find(
        (r) => r.status === "APROVADA" && !contracts.some((c) => c.transportRequestId === r.id),
      ) ?? null);

  if (contratoAguardandoAssinatura || solicitacaoAprovadaSemContrato) {
    return {
      state: "AGUARDANDO_CONTRATO",
      contratoAtivo: null,
      ultimoContrato: contratoAguardandoAssinatura,
      solicitacoesPendentes: [],
      solicitacaoAprovadaSemContrato,
    };
  }

  if (solicitacoesPendentes.length > 0) {
    return {
      state: "SOLICITACAO_PENDENTE",
      contratoAtivo: null,
      ultimoContrato: null,
      solicitacoesPendentes,
      solicitacaoAprovadaSemContrato: null,
    };
  }

  const contratoEncerrado = contracts.find((c) => c.status === "ENCERRADO") ?? null;
  if (contratoEncerrado) {
    return {
      state: "CONTRATO_ENCERRADO",
      contratoAtivo: null,
      ultimoContrato: contratoEncerrado,
      solicitacoesPendentes: [],
      solicitacaoAprovadaSemContrato: null,
    };
  }

  return {
    state: "SEM_TRANSPORTE",
    contratoAtivo: null,
    ultimoContrato: null,
    solicitacoesPendentes: [],
    solicitacaoAprovadaSemContrato: null,
  };
}

/**
 * Estado agregado do Responsável, usado tanto pelo rótulo dinâmico da
 * aba "Transporte" quanto pela tela "Meu Transporte" (mesma fonte de
 * verdade, nunca duas leituras divergentes do mesmo dado).
 */
export function useResponsavelTransportState(): TransportStateResult {
  const requestsQuery = useTransportRequests();
  const contractsQuery = useContracts();

  return useMemo(() => {
    const isLoading = requestsQuery.isLoading || contractsQuery.isLoading;
    if (isLoading) {
      return {
        isLoading,
        state: "SEM_TRANSPORTE",
        contratoAtivo: null,
        ultimoContrato: null,
        solicitacoesPendentes: [],
        solicitacaoAprovadaSemContrato: null,
      };
    }
    return {
      isLoading,
      ...computeState(requestsQuery.data?.items ?? [], contractsQuery.data?.items ?? []),
    };
  }, [requestsQuery.isLoading, requestsQuery.data, contractsQuery.isLoading, contractsQuery.data]);
}

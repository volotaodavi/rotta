import type { ResponsavelTransportState } from "./hooks/use-transport-state";
import type { StatusPillTone } from "@/features/vehicles/components";
import type { ContractStatus, TransportRequestStatus } from "@rotta/api-client";

/** Rótulo da aba "Transporte" do Bottom Navigation, um por estado (briefing "Marketplace" §"NAVEGAÇÃO"). */
export const TRANSPORT_TAB_LABEL: Record<ResponsavelTransportState, string> = {
  SEM_TRANSPORTE: "Transporte",
  SOLICITACAO_PENDENTE: "Solicitação",
  AGUARDANDO_CONTRATO: "Contrato",
  TRANSPORTE_ATIVO: "Meu Transporte",
  CONTRATO_ENCERRADO: "Transporte",
};

export const TRANSPORT_REQUEST_STATUS_LABEL: Record<TransportRequestStatus, string> = {
  RECEBIDA: "Recebida",
  EM_ANALISE: "Em análise",
  APROVADA: "Aprovada",
  RECUSADA: "Recusada",
};

export const TRANSPORT_REQUEST_STATUS_TONE: Record<TransportRequestStatus, StatusPillTone> = {
  RECEBIDA: "info",
  EM_ANALISE: "warning",
  APROVADA: "success",
  RECUSADA: "danger",
};

export const CONTRACT_STATUS_LABEL: Record<ContractStatus, string> = {
  AGUARDANDO_ASSINATURA: "Aguardando assinatura",
  ATIVO: "Ativo",
  ENCERRADO: "Encerrado",
};

export const CONTRACT_STATUS_TONE: Record<ContractStatus, StatusPillTone> = {
  AGUARDANDO_ASSINATURA: "warning",
  ATIVO: "success",
  ENCERRADO: "neutral",
};

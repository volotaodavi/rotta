import type { Contract, TransportRequest } from "@rotta/api-client";
import type { TimelineStep } from "@rotta/ui/native";

/**
 * Etapas reais de status (`TransportRequestStatus`/`Contract`) — usadas
 * tanto pela aba "Transporte" (`transporte-inicio-screen.tsx`, visão
 * completa) quanto pela Home adaptativa da aba "Mapa"
 * (`mapa-screen.tsx`, resumo — Fase 2, Dossiê 38 §3: "Estado 2 —
 * painel operacional"), extraídas para um só lugar para as duas telas
 * nunca divergirem sobre em que etapa o Responsável está.
 */

/** Etapas reais da solicitação (`TransportRequestStatus`) — nunca uma barra de progresso fake. */
export function buildSolicitacaoSteps(request: TransportRequest): TimelineStep[] {
  if (request.status === "RECUSADA") {
    return [
      { key: "enviada", label: "Solicitação enviada", state: "done" },
      { key: "analise", label: "Em análise pelo transportador", state: "done" },
      { key: "resultado", label: "Recusada", state: "error" },
    ];
  }
  return [
    {
      key: "enviada",
      label: "Solicitação enviada",
      state: request.status === "RECEBIDA" ? "current" : "done",
    },
    {
      key: "analise",
      label: "Em análise pelo transportador",
      state:
        request.status === "RECEBIDA"
          ? "pending"
          : request.status === "EM_ANALISE"
            ? "current"
            : "done",
    },
    {
      key: "resultado",
      label: "Aprovada",
      state: request.status === "APROVADA" ? "done" : "pending",
    },
  ];
}

/** Etapas reais da geração/assinatura de contrato — `null` = ainda sem contrato gerado. */
export function buildContratoSteps(contrato: Contract | null): TimelineStep[] {
  return [
    { key: "aprovada", label: "Solicitação aprovada", state: "done" },
    {
      key: "contrato",
      label: "Contrato enviado",
      state: contrato ? "done" : "current",
    },
    {
      key: "assinatura",
      label: "Assinatura pendente",
      state: !contrato ? "pending" : contrato.assinadoResponsavelEm ? "done" : "current",
      description: contrato?.assinadoResponsavelEm
        ? "Você já assinou — aguardando o transportador."
        : undefined,
    },
  ];
}

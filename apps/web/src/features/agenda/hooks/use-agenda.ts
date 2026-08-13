"use client";

import { useQuery } from "@tanstack/react-query";

import type { ListAgendaEventsParams } from "@rotta/api-client";

import { agendaApi } from "@/lib/api-client";

/**
 * Leitura da Agenda da empresa (feriados/recessos/eventos escolares/
 * manutenções/vencimentos — Dossiê 8 §14, tarefa #101). O backend e o
 * `@rotta/api-client` já existiam completos desde aquela entrega, mas
 * nenhum app tinha ligado o `agendaApi`/criado um hook — o módulo nunca
 * tinha uma tela própria. Primeiro consumo real: o widget "Próximos
 * eventos" do painel de Minha Empresa (Frente L, inspirado em "Events &
 * Announcements" de uma imagem de referência de ERP).
 */
export function useAgendaEvents(params: ListAgendaEventsParams = {}) {
  return useQuery({
    queryKey: ["agenda", "events", params],
    queryFn: () => agendaApi.list(params),
  });
}

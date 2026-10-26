"use client";

import { useQuery } from "@tanstack/react-query";

import { dispatchApi } from "@/lib/api-client";

/**
 * De quanto em quanto tempo o Painel Geral se atualiza.
 *
 * Quinze segundos é um meio-termo escolhido com duas contas na mão, não
 * um número redondo:
 *
 *  - **Pelo lado do despachante**, o rastreador manda posição a cada 30
 *    segundos. Recarregar mais rápido que isso só gastaria chamada para
 *    receber a mesma posição de novo.
 *  - **Pelo lado do servidor**, o plano gratuito do Render hiberna após
 *    15 minutos sem requisição. Um painel aberto na sala de operação
 *    nunca deixa esse relógio chegar perto do fim, o que é um efeito
 *    colateral bem-vindo e não o motivo do número.
 *
 * O `refetchInterval` só roda com a aba em primeiro plano (padrão do
 * React Query): painel esquecido aberto a noite inteira não fica
 * batendo na API.
 */
const INTERVALO_DE_ATUALIZACAO_MS = 15_000;

/**
 * O painel inteiro do despachante numa consulta só.
 *
 * `placeholderData` mantém a tela anterior visível durante a
 * atualização, em vez de piscar esqueleto a cada quinze segundos. Num
 * painel de operação isso não é estética: a tela que pisca é a tela que
 * ninguém consegue ler enquanto fala ao telefone.
 */
export function usePainelDoDespachante() {
  return useQuery({
    queryKey: ["dispatch", "painel"],
    queryFn: () => dispatchApi.painel(),
    refetchInterval: INTERVALO_DE_ATUALIZACAO_MS,
    placeholderData: (anterior) => anterior,
  });
}

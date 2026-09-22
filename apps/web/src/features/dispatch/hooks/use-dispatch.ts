"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { SubstituirVeiculoInput } from "@rotta/api-client";

import { routesApi, tripsApi, vehiclesApi } from "@/lib/api-client";

/**
 * Painel do Despachante (pedido do usuário 22/09/2026: "colocando um
 * painel para a transportadora poder alterar a Rota através do número
 * cadastrado pelo ônibus").
 *
 * Nenhum endpoint novo foi criado para isto: a operação inteira do
 * despachante já existia na API, espalhada entre `routes` e `trips`. O
 * que faltava era a PORTA DE ENTRADA pelo ônibus — o despachante não
 * conhece o `routeId`, ele tem na mão a placa do carro que quebrou ou
 * que entrou no rodízio. Daí a única adição no backend: o filtro
 * `veiculoId` em `GET /routes`.
 */

/**
 * Busca de ônibus por placa/modelo — a primeira coisa que o despachante
 * digita. `enabled` só a partir de 2 caracteres para não disparar uma
 * listagem inteira da frota a cada tecla.
 */
export function useBuscaDeVeiculos(termo: string) {
  const busca = termo.trim();
  return useQuery({
    queryKey: ["dispatch", "vehicles", busca],
    queryFn: () => vehiclesApi.list({ search: busca, page: 1, pageSize: 10 }),
    enabled: busca.length >= 2,
  });
}

/** A frota inteira — alimenta o seletor do ônibus SUBSTITUTO. */
export function useFrotaParaSubstituicao() {
  return useQuery({
    queryKey: ["dispatch", "vehicles", "todos"],
    queryFn: () => vehiclesApi.list({ page: 1, pageSize: 100, sortBy: "placa", sortOrder: "asc" }),
  });
}

/** Rotas cujo veículo PADRÃO é este ônibus. */
export function useRotasDoVeiculo(veiculoId: string | undefined) {
  return useQuery({
    queryKey: ["dispatch", "routes", veiculoId],
    queryFn: () => routesApi.list({ veiculoId, page: 1, pageSize: 100 }),
    enabled: Boolean(veiculoId),
  });
}

/**
 * A viagem de HOJE desta rota, ou `null`.
 *
 * É esta resposta que decide qual das duas ações o despachante pode
 * tomar — e as duas são deliberadamente diferentes, ver
 * `useTrocarOnibusDeHoje`/`useTrocarOnibusPadrao` abaixo.
 */
export function useViagemDeHoje(routeId: string | undefined) {
  return useQuery({
    queryKey: ["dispatch", "trip-today", routeId],
    queryFn: () => tripsApi.findTodayByRoute(routeId as string),
    enabled: Boolean(routeId),
    // Mesma cadência de `useTodayTrip` do Modo Ação: enquanto a viagem
    // roda, o motorista pode pausar/encerrar por conta dele e o painel
    // não pode continuar oferecendo uma troca que já não faz sentido.
    refetchInterval: (query) =>
      query.state.data?.status === "EM_ANDAMENTO" || query.state.data?.status === "PAUSADA"
        ? 20_000
        : false,
  });
}

function invalidarPainel(queryClient: ReturnType<typeof useQueryClient>): void {
  void queryClient.invalidateQueries({ queryKey: ["dispatch"] });
  // O Modo Ação e "Minhas Rotas" leem as mesmas viagens por outra
  // chave — sem isto, quem estiver com as duas telas abertas vê o
  // painel atualizado e a outra tela desatualizada.
  void queryClient.invalidateQueries({ queryKey: ["driver"] });
  void queryClient.invalidateQueries({ queryKey: ["routes"] });
}

/**
 * Troca o ônibus da viagem de HOJE — o caso urgente (o carro quebrou
 * com a viagem em andamento, ou não vai sair).
 *
 * Esta é a ação que NOTIFICA: `TripsService.substituirVeiculo` dispara
 * `VEICULO_ALTERADO` para os responsáveis de todos os alunos ativos da
 * rota, e esse evento está em `[PUSH]` no
 * `NotificationChannelSelectorService` — ou seja, chega no celular na
 * hora, sem depender de ninguém abrir o app. A troca vale só para a
 * viagem de hoje: o `veiculoPadraoId` da rota continua intacto, e
 * amanhã a rota volta ao carro de sempre.
 */
export function useTrocarOnibusDeHoje() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ tripId, ...input }: SubstituirVeiculoInput & { tripId: string }) =>
      tripsApi.substituirVeiculo(tripId, input),
    onSuccess: () => invalidarPainel(queryClient),
  });
}

/**
 * Troca o ônibus PADRÃO da rota — o rodízio planejado, que passa a
 * valer da próxima viagem em diante.
 *
 * Esta ação NÃO notifica ninguém, e isso é deliberado, não esquecimento:
 * o carro de hoje não mudou. Avisar agora um responsável de que "o
 * veículo mudou" enquanto o filho está dentro do carro antigo seria uma
 * informação falsa no pior momento possível. Quando a viagem de amanhã
 * começar, ela já nasce com o veículo novo — e é o `TRIP_INICIADA` de
 * amanhã que conta essa história, no momento em que ela é verdade.
 */
export function useTrocarOnibusPadrao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ routeId, veiculoId }: { routeId: string; veiculoId: string }) =>
      routesApi.update(routeId, { veiculoPadraoId: veiculoId }),
    onSuccess: () => invalidarPainel(queryClient),
  });
}

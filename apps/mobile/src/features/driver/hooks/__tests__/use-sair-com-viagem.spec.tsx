import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook } from "@testing-library/react-native";
import { Alert } from "react-native";

import { useSairDaConta } from "../use-sair-com-viagem";

import type { ReactNode } from "react";

/**
 * `RN-AUTH-05` — sair da conta com viagem em andamento.
 *
 * Antes da auditoria de 18/09/2026, "Sair" encerrava a sessão na hora,
 * em qualquer situação. Um toque errado no meio de uma rota derrubava o
 * rastreamento de um veículo com crianças dentro — e do lado da
 * família o ponto no mapa simplesmente parava de se mexer, sem aviso
 * nenhum.
 */

const mockLogout = jest.fn();

jest.mock("@rotta/auth/native", () => ({
  useAuth: () => ({ logout: mockLogout }),
}));

// Dublê em vez do módulo real: `background-trip-location-task` registra
// a task nativa de GPS ao ser importado e arrasta o cliente de API
// junto, o que deixa handles abertos e faz o Jest não terminar. O que
// este teste precisa dele é uma resposta só — qual viagem está sendo
// rastreada.
let mockTripRastreada: string | null = null;

jest.mock("../background-trip-location-task", () => ({
  getActiveTripId: () => mockTripRastreada,
}));

const setActiveTripId = (tripId: string | null): void => {
  mockTripRastreada = tripId;
};

function comQueryClient(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }): JSX.Element {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

const clientes: QueryClient[] = [];

const renderizar = (queryClient = new QueryClient()) => {
  clientes.push(queryClient);
  return renderHook(() => useSairDaConta(), { wrapper: comQueryClient(queryClient) });
};

beforeEach(() => {
  mockLogout.mockReset();
  setActiveTripId(null);
  jest.spyOn(Alert, "alert").mockImplementation(() => undefined);
});

afterEach(() => {
  // Sem isto o Jest avisa que um worker não encerrou: cada `QueryClient`
  // deixa um temporizador de coleta de lixo rodando.
  clientes.splice(0).forEach((cliente) => cliente.clear());
  jest.restoreAllMocks();
});

it("sai direto quando não há viagem", () => {
  const { result } = renderizar();

  result.current();

  expect(mockLogout).toHaveBeenCalledTimes(1);
  expect(Alert.alert).not.toHaveBeenCalled();
});

it("pergunta antes quando o rastreamento está ligado", () => {
  setActiveTripId("trip-1");
  const { result } = renderizar();

  result.current();

  expect(mockLogout).not.toHaveBeenCalled();
  expect(Alert.alert).toHaveBeenCalled();
});

it("pergunta quando a viagem de hoje está em andamento, mesmo sem rastreamento", () => {
  // O caso de quem negou a permissão de localização: não há
  // `activeTripId`, mas a viagem existe e está rodando.
  const queryClient = new QueryClient();
  queryClient.setQueryData(["driver", "routes", "route-1", "trip-today"], {
    id: "trip-1",
    status: "EM_ANDAMENTO",
  });
  const { result } = renderizar(queryClient);

  result.current();

  expect(mockLogout).not.toHaveBeenCalled();
  expect(Alert.alert).toHaveBeenCalled();
});

it("viagem PAUSADA também conta — o veículo continua em operação", () => {
  const queryClient = new QueryClient();
  queryClient.setQueryData(["driver", "routes", "route-1", "trip-today"], {
    id: "trip-1",
    status: "PAUSADA",
  });
  const { result } = renderizar(queryClient);

  result.current();

  expect(Alert.alert).toHaveBeenCalled();
});

it("viagem já finalizada não segura ninguém", () => {
  const queryClient = new QueryClient();
  queryClient.setQueryData(["driver", "routes", "route-1", "trip-today"], {
    id: "trip-1",
    status: "FINALIZADA",
  });
  const { result } = renderizar(queryClient);

  result.current();

  expect(mockLogout).toHaveBeenCalledTimes(1);
});

it("lista de rotas no cache não é confundida com viagem", () => {
  // A mesma chave `["driver", "routes", ...]` guarda listas de rotas.
  // Uma checagem ingênua acharia "status" em qualquer coisa.
  const queryClient = new QueryClient();
  queryClient.setQueryData(["driver", "routes"], [{ id: "route-1", nome: "Rota A" }]);
  const { result } = renderizar(queryClient);

  result.current();

  expect(mockLogout).toHaveBeenCalledTimes(1);
});

it("confirmar a saída na pergunta encerra a sessão", () => {
  setActiveTripId("trip-1");
  const { result } = renderizar();

  result.current();

  const botoes = (Alert.alert as jest.Mock).mock.calls[0][2] as {
    text: string;
    onPress?: () => void;
  }[];
  const sairMesmo = botoes.find((b) => b.text === "Sair mesmo assim");
  sairMesmo?.onPress?.();

  expect(mockLogout).toHaveBeenCalledTimes(1);
});

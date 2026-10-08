import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { CentralScreen } from "../screens/central-screen";

import type { NotificationsStackParamList } from "@/navigation/types";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { NotificationEventType } from "@rotta/api-client";
import type { ReactNode } from "react";

import { ThemeProvider } from "@/providers/theme-provider";

/**
 * A Central de Notificações não cai por causa de um tipo que esta
 * versão do app não conhece.
 *
 * ## O que este teste reproduz
 *
 * Em 07/10/2026 um usuário abriu a Central e viu "Algo deu errado",
 * duas vezes em doze segundos. O registro que chegou ao plantão foi
 * "Element type is invalid: expected a string (for built-in components)
 * or a class/function (for composite components) but got: undefined",
 * com doze quadros de pilha todos de dentro do React e nenhum do
 * produto.
 *
 * A tela fazia `NOTIFICATION_TYPE_ICON[notification.tipo]` e usava o
 * resultado como componente. O mapa tinha 26 tipos, o banco tinha 45, e
 * `<undefined />` derruba a árvore inteira.
 *
 * ## Por que ele monta a tela de verdade, e não chama uma função
 *
 * Porque o defeito não estava numa função, estava na costura entre o
 * mapa e o JSX. `tipo-desconhecido.spec.ts` cobre os resolvedores em
 * isolamento; este cobre o que o usuário faz: abrir a tela com uma
 * notificação que o app não sabe classificar.
 *
 * `@rotta/icons/native` NÃO é mockado aqui, de propósito, e é a decisão
 * central deste arquivo. Outros testes do app mockam esse barrel com um
 * Proxy que devolve `View` para qualquer nome — útil para telas onde o
 * ícone é só enfeite, e fatal aqui: um Proxy faz todo tipo resolver
 * para algo válido e esconde exatamente o defeito que se quer prender.
 */

jest.mock("react-native-webview", () => {
  const { View } = jest.requireActual("react-native");
  return { WebView: View };
});

/* O prefixo `mock` é exigência do Jest: só variáveis assim podem ser
   referenciadas de dentro da fábrica de `jest.mock`. */
const mockList = jest.fn();

jest.mock("@/lib/api-client", () => ({
  notificationsApi: {
    list: (...args: unknown[]) => mockList(...args),
    markRead: jest.fn(() => Promise.resolve({})),
    markAllRead: jest.fn(() => Promise.resolve({})),
  },
}));

/** Um tipo que o banco pode gravar e esta versão do app não conhece. */
const TIPO_DO_FUTURO = "ALGO_QUE_AINDA_NAO_EXISTE" as NotificationEventType;

function notificacao(tipo: NotificationEventType, titulo: string) {
  return {
    id: `id-${tipo}`,
    tipo,
    titulo,
    corpo: "Corpo da notificação.",
    prioridade: "INFORMATIVA",
    lida: false,
    favoritada: false,
    arquivada: false,
    createdAt: new Date().toISOString(),
  };
}

function Envolve({ children }: { children: ReactNode }): JSX.Element {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return (
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 390, height: 844 },
        insets: { top: 47, left: 0, right: 0, bottom: 34 },
      }}
    >
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

type Props = NativeStackScreenProps<NotificationsStackParamList, "Central">;

/* A tela só usa `navigation.navigate`; o resto da API não é tocado. */
const navigate = jest.fn();
const navigation = { navigate } as unknown as Props["navigation"];
const route = { key: "Central", name: "Central" } as unknown as Props["route"];

describe("CentralScreen com tipo de notificação desconhecido", () => {
  beforeEach(() => {
    mockList.mockReset();
    navigate.mockClear();
  });

  it("renderiza a lista em vez de derrubar a árvore", async () => {
    mockList.mockResolvedValue({
      items: [notificacao(TIPO_DO_FUTURO, "Novidade que o app não conhece")],
      total: 1,
      page: 1,
      pageSize: 20,
    });

    render(<CentralScreen navigation={navigation} route={route} />, { wrapper: Envolve });

    /*
      Antes do conserto, este `waitFor` nunca encontrava o título: o
      render estourava e o que aparecia era a tela de erro do
      `AppErrorBoundary`.
    */
    await waitFor(() => {
      expect(screen.getByText("Novidade que o app não conhece")).toBeTruthy();
    });
    expect(screen.getByText("Notificações")).toBeTruthy();
  });

  it("mostra junto as conhecidas e a desconhecida, sem perder nenhuma", async () => {
    mockList.mockResolvedValue({
      items: [
        notificacao("EMERGENCIA", "Emergência na rota"),
        notificacao(TIPO_DO_FUTURO, "Novidade que o app não conhece"),
        notificacao("CADASTRO_CONCLUIDO", "Bem-vindo à Rotta"),
      ],
      total: 3,
      page: 1,
      pageSize: 20,
    });

    render(<CentralScreen navigation={navigation} route={route} />, { wrapper: Envolve });

    await waitFor(() => {
      expect(screen.getByText("Emergência na rota")).toBeTruthy();
    });
    /*
      `CADASTRO_CONCLUIDO` está aqui por motivo específico: era um dos
      19 tipos que o mapa não tinha, e é das primeiras notificações que
      qualquer conta nova recebe. Ou seja, bastava criar uma conta para
      a Central ficar inabrível.
    */
    expect(screen.getByText("Bem-vindo à Rotta")).toBeTruthy();
    expect(screen.getByText("Novidade que o app não conhece")).toBeTruthy();
  });
});

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react-native";

import { RootNavigator } from "../RootNavigator";

import type { MeResponse } from "@rotta/api-client";
import type { ReactNode } from "react";

import { ThemeProvider } from "@/providers/theme-provider";

/**
 * INCIDENTE 21/09/2026 — "o transportador ao ENTRAR na sua devida conta
 * aparece ROTTA + tela azul e fica piscando toda hora. NÃO CARREGA."
 *
 * Eu errei a causa três vezes lendo código e deduzindo. Este teste
 * existe para parar de deduzir: ele MONTA a árvore de navegação de
 * verdade, com um usuário `role === "empresa"`, e falha dizendo o que
 * quebra — em vez de me deixar supor.
 *
 * Cobre os dois tipos de transportador, porque eles seguem caminhos
 * diferentes no `RootNavigator`:
 *
 *   - LTDA (e demais): `canToggle` é FALSE, então nada do `useAppMode`
 *     se aplica — foi a falha do meu raciocínio anterior, que tratou
 *     todo transportador como autônomo/MEI;
 *   - AUTONOMO/MEI: `canToggle` é TRUE.
 */

// `@rotta/icons/native` reexporta `lucide-react-native`, que publica
// `.mjs` e não tem transformador configurado no Jest. Ícone nenhum
// decide se a árvore monta, então um stub para qualquer nome resolve
// sem mexer na configuração do projeto.
jest.mock("@rotta/icons/native", () => {
  const { View } = jest.requireActual("react-native");
  return new Proxy({} as Record<string, unknown>, {
    get: () => View,
  });
});

// Módulos NATIVOS que não existem no Jest. Nenhum deles participa da
// decisão "a árvore do transportador monta?" — só precisam não explodir
// no `import`.
jest.mock("react-native-webview", () => {
  const { View } = jest.requireActual("react-native");
  return { WebView: View };
});

jest.mock("@rotta/maps/native", () => {
  const { View } = jest.requireActual("react-native");
  return new Proxy({ configureRottaMaps: () => undefined } as Record<string, unknown>, {
    get: (alvo, chave) => (chave in alvo ? alvo[chave as string] : View),
  });
});

const mockUser: { atual: MeResponse | null } = { atual: null };

jest.mock("@rotta/auth/native", () => ({
  useAuth: () => ({
    status: mockUser.atual ? "authenticated" : "unauthenticated",
    user: mockUser.atual,
    logout: jest.fn(),
  }),
}));

// Silencia o que não é o objeto do teste: cada um destes já tem
// cobertura própria e nenhum decide se a árvore monta.
jest.mock("@/features/auth/hooks/use-pin-lock", () => ({
  usePinLock: () => ({ isLocked: false, unlock: jest.fn() }),
}));
jest.mock("@/features/notifications/hooks/use-push-registration", () => ({
  usePushRegistration: () => undefined,
}));
jest.mock("@/features/driver/hooks/use-identity-verification", () => ({
  useMyIdentityVerification: () => ({ data: undefined, isLoading: false }),
}));
jest.mock("@/lib/cofre-seguro", () => ({
  lerDoCofre: jest.fn().mockResolvedValue(null),
  gravarNoCofre: jest.fn().mockResolvedValue(true),
  apagarDoCofre: jest.fn().mockResolvedValue(undefined),
}));

const transportador = (companyType: string): MeResponse =>
  ({
    id: "user-empresa-1",
    nome: "Transportes Teste",
    role: "empresa",
    companyId: "company-1",
    companyType,
    billingBlocked: false,
  }) as unknown as MeResponse;

function Envolvido({ children }: { children: ReactNode }): JSX.Element {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>{children}</ThemeProvider>
    </QueryClientProvider>
  );
}

afterEach(() => {
  mockUser.atual = null;
});

describe("RootNavigator — entrada do transportador", () => {
  it("LTDA: monta a árvore da Empresa, não a splash", async () => {
    mockUser.atual = transportador("LTDA");

    render(
      <Envolvido>
        <RootNavigator />
      </Envolvido>,
    );

    // "Carregando a Rotta" é o rótulo de acessibilidade da splash. Se
    // ele continuar na tela, é exatamente o defeito relatado.
    await waitFor(() => {
      expect(screen.queryByLabelText("Carregando a Rotta")).toBeNull();
    });
  });

  it("MEI: monta a árvore da Empresa, não a splash", async () => {
    mockUser.atual = transportador("MEI");

    render(
      <Envolvido>
        <RootNavigator />
      </Envolvido>,
    );

    await waitFor(() => {
      expect(screen.queryByLabelText("Carregando a Rotta")).toBeNull();
    });
  });
});

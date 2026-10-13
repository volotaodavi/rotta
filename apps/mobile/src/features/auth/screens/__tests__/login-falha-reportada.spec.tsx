import { ApiError } from "@rotta/api-client";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { TextInput } from "react-native";

import { LoginScreen } from "../login-screen";

import type { AuthStackParamList } from "@/navigation/types";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { ThemeProvider } from "@/providers/theme-provider";

/**
 * Uma falha de login que o app trata sozinho continua sendo uma falha.
 *
 * ## O que aconteceu em 13/10/2026
 *
 * O fundador tentou entrar no app e recebeu "Erro inesperado ao
 * entrar", com a senha certa. O banco provava que o servidor tinha
 * processado o login: `tentativasLoginFalhas` estava zerado (o contador
 * sobe a cada senha errada e só zera numa entrada bem-sucedida) e a
 * linha do usuário tinha sido atualizada no horário da tentativa.
 *
 * E o plantão de erro não tinha NADA. O `catch` da tela trocava o erro
 * real por uma frase genérica e seguia adiante, então não havia como
 * saber se foi conexão caída, requisição abortada ou defeito nosso.
 *
 * É literalmente a mesma cegueira de 06/10/2026, quando a renovação de
 * sessão falhava em silêncio e o plantão mostrou zero erro numa semana
 * inteira com o app inutilizável. A lição se repetiu porque na primeira
 * vez eu a apliquei só naquele caminho.
 *
 * ## Por que o segundo teste importa tanto quanto o primeiro
 *
 * Porque reportar DEMAIS destrói o plantão igual a não reportar. Senha
 * errada é uso normal do produto, acontece o tempo todo, e viraria
 * ruído que esconde o sinal. O limite é claro: veio resposta do
 * servidor, a mensagem dele basta; não veio resposta nenhuma, vira
 * registro.
 */

/* `react-native-webview` é módulo nativo e não existe no Jest; nenhuma
   das telas usadas aqui depende dele para nada deste teste. */
jest.mock("react-native-webview", () => {
  const { View } = jest.requireActual("react-native");
  return { WebView: View };
});

const mockReport = jest.fn<Promise<unknown>, [Record<string, unknown>]>(() => Promise.resolve({}));
const mockLogin = jest.fn();

jest.mock("@/lib/api-client", () => ({
  clientErrorsApi: {
    report: (entrada: Record<string, unknown>) => mockReport(entrada),
  },
}));

jest.mock("@rotta/auth/native", () => ({
  useAuth: () => ({ login: (...a: unknown[]) => mockLogin(...a), logout: jest.fn() }),
}));

type Props = NativeStackScreenProps<AuthStackParamList, "Login">;
const navigation = { navigate: jest.fn() } as unknown as Props["navigation"];
const route = { key: "Login", name: "Login" } as unknown as Props["route"];

function montar() {
  return render(
    <ThemeProvider>
      <LoginScreen navigation={navigation} route={route} />
    </ThemeProvider>,
  );
}

async function tentarEntrar() {
  /* Dois campos na tela, nesta ordem: identificador e senha. */
  const campos = screen.UNSAFE_getAllByType(TextInput);
  fireEvent.changeText(campos[0]!, "alguem@exemplo.com");
  fireEvent.changeText(campos[campos.length - 1]!, "uma-senha-qualquer");
  /* "Entrar" é também o título da tela; o botão se pega pelo papel. */
  fireEvent.press(screen.getByRole("button", { name: "Entrar" }));
}

describe("falha ao entrar", () => {
  beforeEach(() => {
    mockReport.mockClear();
    mockLogin.mockReset();
  });

  it("reporta ao plantão quando não houve resposta do servidor", async () => {
    /*
      É isto que o React Native lança quando a conexão cai no meio: um
      TypeError cru, sem status, sem corpo. Não é `ApiError`, e era
      exatamente o que a tela engolia.
    */
    mockLogin.mockRejectedValue(new TypeError("Network request failed"));

    montar();
    await tentarEntrar();

    await waitFor(() => {
      expect(mockReport).toHaveBeenCalledTimes(1);
    });
    const enviado = mockReport.mock.calls[0]![0] as {
      source?: string;
      message?: string;
      stack?: string;
      path?: string;
      buildId?: string;
    };
    expect(enviado.source).toBe("login-falhou");
    expect(enviado.message).toBe("Network request failed");
    /* O NOME do erro é o que separa rede de abort de bug nosso. */
    expect(enviado.stack).toContain("TypeError");
    expect(enviado.path).toBe("Login");
    expect(enviado.buildId).toBeTruthy();
  });

  it('diz à pessoa o que houve, em vez de "erro inesperado"', async () => {
    mockLogin.mockRejectedValue(new TypeError("Network request failed"));

    montar();
    await tentarEntrar();

    await waitFor(() => {
      expect(
        screen.getByText(
          "Não foi possível falar com o servidor. Verifique sua conexão e tente de novo.",
        ),
      ).toBeTruthy();
    });
  });

  it("NÃO reporta senha errada, e mostra a mensagem do servidor", async () => {
    mockLogin.mockRejectedValue(
      new ApiError(401, {
        code: "UNAUTHORIZED",
        message: "Não foi possível entrar. Verifique os dados e tente novamente.",
      }),
    );

    montar();
    await tentarEntrar();

    await waitFor(() => {
      expect(
        screen.getByText("Não foi possível entrar. Verifique os dados e tente novamente."),
      ).toBeTruthy();
    });
    /*
      Sem isto o plantão encheria de ruído: errar a senha é uso normal
      do produto, e um plantão cheio de ruído esconde o sinal tão bem
      quanto um plantão vazio.
    */
    expect(mockReport).not.toHaveBeenCalled();
  });
});

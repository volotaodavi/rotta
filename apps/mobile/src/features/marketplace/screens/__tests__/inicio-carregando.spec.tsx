import { render, screen } from "@testing-library/react-native";

import { ParentInicioScreen } from "../inicio-screen";

import { ThemeProvider } from "@/providers/theme-provider";

/**
 * A primeira tela do responsável durante a partida fria.
 *
 * ## O que havia aqui
 *
 * `isLoading ? null`. A tela desenhava "Olá, Davi!" e mais nada
 * enquanto a consulta não voltava. A API dorme no plano gratuito do
 * Render e leva perto de 90 segundos para acordar, então a mãe que abre
 * o app para ver onde está a van encontra uma saudação e um vazio, o
 * que é indistinguível de aplicativo quebrado.
 *
 * É a terceira vez que a mesma partida fria aparece com rosto
 * diferente: derrubou a abertura do app em 06/10/2026, o login em
 * 13/10/2026, e estava aqui, no primeiro lugar que o responsável olha.
 *
 * ## O que o teste prende
 *
 * Que carregando NÃO é confundido com vazio. Mostrar "Você ainda não
 * tem transporte escolar" para quem tem transporte, só porque a
 * resposta demorou, é pior que não mostrar nada: é informação errada
 * com cara de informação certa.
 */

jest.mock("react-native-webview", () => {
  const { View } = jest.requireActual("react-native");
  return { WebView: View };
});

/*
  `transporte-inicio-screen` importa o mapa, que por baixo é
  `@maplibre/maplibre-react-native`, módulo nativo que não existe no
  Jest e estoura no `import`. Esta tela só usa duas peças de lá, e
  nenhuma delas participa do que está sendo testado aqui, que é o
  estado de carregamento.
*/
jest.mock("../transporte-inicio-screen", () => {
  const { View } = jest.requireActual("react-native");
  return { AcompanhamentoSection: View, TripTrackingOverlay: View };
});

jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
}));

jest.mock("@rotta/auth/native", () => ({
  useAuth: () => ({ user: { nome: "Davi Volotão" } }),
}));

const mockEstado = jest.fn();
jest.mock("../../hooks/use-transport-state", () => ({
  useResponsavelTransportState: () => mockEstado(),
}));

jest.mock("../../hooks/use-students", () => ({
  useStudent: () => ({ data: undefined }),
}));

function montar() {
  return render(
    <ThemeProvider>
      <ParentInicioScreen />
    </ThemeProvider>,
  );
}

describe("Início do responsável", () => {
  it("diz que está buscando, em vez de deixar a tela vazia", () => {
    mockEstado.mockReturnValue({
      state: "SEM_TRANSPORTE",
      isLoading: true,
      contratoAtivo: null,
      ultimoContrato: null,
      solicitacoesPendentes: [],
      solicitacaoAprovadaSemContrato: false,
    });

    montar();

    expect(screen.getByText("Buscando as informações do transporte.")).toBeTruthy();
  });

  it("não anuncia 'você ainda não tem transporte' enquanto carrega", () => {
    /*
      Este é o erro que importa. Dizer a quem TEM transporte que não tem,
      só porque a resposta demorou, é informação errada com cara de
      informação certa, e manda a pessoa procurar transportador que ela
      já contratou.
    */
    mockEstado.mockReturnValue({
      state: "SEM_TRANSPORTE",
      isLoading: true,
      contratoAtivo: null,
      ultimoContrato: null,
      solicitacoesPendentes: [],
      solicitacaoAprovadaSemContrato: false,
    });

    montar();

    expect(screen.queryByText("Você ainda não tem transporte escolar")).toBeNull();
  });

  it("mostra o estado vazio de verdade quando a resposta chega", () => {
    mockEstado.mockReturnValue({
      state: "SEM_TRANSPORTE",
      isLoading: false,
      contratoAtivo: null,
      ultimoContrato: null,
      solicitacoesPendentes: [],
      solicitacaoAprovadaSemContrato: false,
    });

    montar();

    expect(screen.getByText("Você ainda não tem transporte escolar")).toBeTruthy();
    expect(screen.queryByText("Buscando as informações do transporte.")).toBeNull();
  });
});

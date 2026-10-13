/**
 * Auditoria minuciosa 04/09/2026 — cobre o `AppErrorBoundary` recém
 * criado (rede de segurança que nunca existiu antes desta auditoria):
 * confirma que ele (1) deixa os filhos passarem quando nada quebra,
 * (2) mostra a tela "Algo deu errado" quando um filho lança, (3) manda
 * o erro pro backend via `clientErrorsApi`, e (4) "Tentar novamente"
 * de fato tenta renderizar os filhos de novo.
 */
import { fireEvent, render, screen } from "@testing-library/react-native";
import { Text } from "react-native";

import { AppErrorBoundary } from "./app-error-boundary";

import { clientErrorsApi } from "@/lib/api-client";

jest.mock("@/lib/api-client", () => ({
  clientErrorsApi: { report: jest.fn() },
}));

/** Quebra do mesmo jeito que o crash real de 07/10/2026: tipo `undefined`. */
function TelaQueQuebra(): JSX.Element {
  const Quebrado = undefined as unknown as () => JSX.Element;
  return <Quebrado />;
}

/** Lança sempre que `deveLancar` é `true` — usado nos testes que só verificam a tela de erro em si. */
function BombaControlada({ deveLancar }: { deveLancar: boolean }): JSX.Element {
  if (deveLancar) {
    throw new Error("Falha proposital do teste");
  }
  return <Text>Conteúdo normal</Text>;
}

let tentativasRestantes = 0;

/** Lança só nas primeiras `tentativasRestantes` renderizações — simula uma falha transitória real (ex.: um dado ainda não carregado) que "Tentar novamente" de fato consegue superar. */
function BombaTransitoria(): JSX.Element {
  if (tentativasRestantes > 0) {
    tentativasRestantes -= 1;
    throw new Error("Falha transitória");
  }
  return <Text>Recuperado</Text>;
}

// A própria implementação do React loga o erro capturado no console
// durante o teste (comportamento esperado, não um teste quebrado) —
// silenciado só aqui pra não poluir a saída.
let consoleErrorSpy: jest.SpyInstance;
beforeEach(() => {
  consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);
  (clientErrorsApi.report as jest.Mock).mockResolvedValue(undefined);
});
afterEach(() => {
  consoleErrorSpy.mockRestore();
  jest.clearAllMocks();
});

describe("AppErrorBoundary", () => {
  it("renderiza os filhos normalmente quando nada quebra", () => {
    render(
      <AppErrorBoundary>
        <Text>Tudo certo</Text>
      </AppErrorBoundary>,
    );
    expect(screen.getByText("Tudo certo")).toBeTruthy();
  });

  it("mostra 'Algo deu errado' quando um filho lança durante o render", () => {
    render(
      <AppErrorBoundary>
        <BombaControlada deveLancar />
      </AppErrorBoundary>,
    );
    expect(screen.getByText("Algo deu errado")).toBeTruthy();
    expect(screen.getByText("Falha proposital do teste")).toBeTruthy();
  });

  it("reporta o erro pro backend com app: MOBILE e source: error-boundary", () => {
    render(
      <AppErrorBoundary>
        <BombaControlada deveLancar />
      </AppErrorBoundary>,
    );
    expect(clientErrorsApi.report).toHaveBeenCalledWith(
      expect.objectContaining({
        app: "MOBILE",
        message: "Falha proposital do teste",
        source: "error-boundary",
      }),
    );
  });

  /*
    OS DOIS TESTES ABAIXO ENTRARAM EM 08/10/2026, e nascem de um crash
    de produção que não deu para consertar.

    Um usuário recebeu "Element type is invalid: expected a string (for
    built-in components) or a class/function (for composite components)
    but got: undefined" duas vezes em doze segundos. O relatório que
    chegou ao plantão do CTO tinha doze quadros de pilha, todos de
    dentro do reconciliador do React, nenhum do produto, em endereço de
    bytecode Hermes (`index.android.bundle:1:345165`), e `buildId`
    vazio. Dava para saber que algo quebrou, não o quê nem em qual
    build.

    O React sempre soube a resposta: `componentDidCatch` recebe um
    segundo argumento com a cadeia de componentes, que nomeia a tela e
    sobrevive à minificação. Esta classe ignorava esse argumento.
    `apps/web` já anexava o `componentStack` desde 03/09/2026 (ver
    `section-error-boundary.tsx`); o app tinha ficado de fora.
  */
  it("manda a árvore de componentes junto, que é o que nomeia a tela quebrada", () => {
    render(
      <AppErrorBoundary>
        <TelaQueQuebra />
      </AppErrorBoundary>,
    );

    const enviado = (clientErrorsApi.report as jest.Mock).mock.calls[0][0] as { stack?: string };
    expect(enviado.stack).toContain("--- component stack ---");
    expect(enviado.stack).toContain("TelaQueQuebra");
  });

  it("diz qual build quebrou, sempre, nunca vazio", () => {
    render(
      <AppErrorBoundary>
        <BombaControlada deveLancar />
      </AppErrorBoundary>,
    );

    const enviado = (clientErrorsApi.report as jest.Mock).mock.calls[0][0] as {
      buildId?: string;
    };
    /*
      A PRIMEIRA versão deste conserto mandava `undefined` quando
      `Constants.expoConfig` não respondia, e foi o que aconteceu no
      build de produção: seis relatórios chegaram ao plantão sem build
      nenhum, indistinguíveis de "o aparelho está com uma versão antiga
      do app". A ambiguidade custou uma noite de investigação. Agora o
      campo nunca vem vazio, e o sufixo diz qual fonte respondeu.
    */
    expect(enviado.buildId).toBeTruthy();
    expect(enviado.buildId).toContain("1.3.0");
  });

  it('nomeia a tela em vez da constante "(mobile)"', () => {
    render(
      <AppErrorBoundary>
        <BombaControlada deveLancar />
      </AppErrorBoundary>,
    );

    const enviado = (clientErrorsApi.report as jest.Mock).mock.calls[0][0] as { path?: string };
    /*
      Sem `NavigationContainer` montado neste teste, `telaAtual()`
      devolve `null` e o relatório diz isso com clareza. O que NÃO pode
      voltar é a constante "(mobile)", que era igual para as 96 telas do
      app e tornou seis relatórios de crash inúteis.
    */
    expect(enviado.path).toBe("(tela desconhecida)");
    expect(enviado.path).not.toBe("(mobile)");
  });

  it("diz quando o React não forneceu a árvore de componentes", () => {
    render(
      <AppErrorBoundary>
        <BombaControlada deveLancar />
      </AppErrorBoundary>,
    );

    const enviado = (clientErrorsApi.report as jest.Mock).mock.calls[0][0] as { stack?: string };
    /*
      A seção existe SEMPRE. A versão anterior a omitia quando o React
      não dava árvore, e aí o relatório saía idêntico ao de um app sem
      este código — as duas causas viravam a mesma saída. Um instrumento
      que falha igual a "não instalado" não é instrumento.

      Aqui o React FORNECE a árvore (ambiente de teste), então o
      conteúdo é real e não o aviso.
    */
    expect(enviado.stack).toContain("--- component stack ---");
    expect(enviado.stack).not.toContain("nao forneceu componentStack");
  });

  it("nunca lança mesmo se o próprio reporte de erro falhar (rede fora do ar)", () => {
    (clientErrorsApi.report as jest.Mock).mockRejectedValue(new Error("rede fora do ar"));
    expect(() =>
      render(
        <AppErrorBoundary>
          <BombaControlada deveLancar />
        </AppErrorBoundary>,
      ),
    ).not.toThrow();
    expect(screen.getByText("Algo deu errado")).toBeTruthy();
  });

  it("'Tentar novamente' tenta renderizar os filhos de novo (não fica preso na tela de erro pra sempre)", () => {
    tentativasRestantes = 1;
    render(
      <AppErrorBoundary>
        <BombaTransitoria />
      </AppErrorBoundary>,
    );
    expect(screen.getByText("Algo deu errado")).toBeTruthy();

    fireEvent.press(screen.getByRole("button", { name: "Tentar novamente" }));

    expect(screen.getByText("Recuperado")).toBeTruthy();
    expect(screen.queryByText("Algo deu errado")).toBeNull();
  });
});

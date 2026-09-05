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

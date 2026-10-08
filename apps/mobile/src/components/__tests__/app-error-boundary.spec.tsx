import { render } from "@testing-library/react-native";
import { Text } from "react-native";

import { AppErrorBoundary } from "../app-error-boundary";

import { clientErrorsApi } from "@/lib/api-client";

jest.mock("@/lib/api-client", () => ({
  clientErrorsApi: { report: jest.fn(() => Promise.resolve({})) },
}));

const report = clientErrorsApi.report as jest.Mock;

/**
 * O crash de 07/10/2026, e por que ele não era diagnosticável.
 *
 * Um usuário abriu o app e recebeu "Element type is invalid: expected a
 * string ... but got: undefined", duas vezes em doze segundos. O
 * relatório chegou ao plantão do CTO com doze quadros de pilha, todos
 * de dentro do reconciliador do React, nenhum do produto, em endereço
 * de bytecode Hermes. Não havia como saber qual tela tinha quebrado.
 *
 * O React sempre soube a resposta: `componentDidCatch` recebe um
 * segundo argumento com a cadeia de componentes. Esta classe ignorava
 * esse argumento, e `buildId` ia vazio por cima, então também não se
 * sabia qual build era.
 *
 * Os dois testes abaixo falham no código anterior ao conserto.
 */

/** Componente que quebra do mesmo jeito que o crash real: tipo `undefined`. */
function TelaQueQuebra(): JSX.Element {
  const Quebrado = undefined as unknown as () => JSX.Element;
  return <Quebrado />;
}

describe("AppErrorBoundary", () => {
  const erroOriginal = console.error;

  beforeEach(() => {
    report.mockClear();
    // O React imprime o erro capturado; silenciado para a saída do
    // teste continuar legível. O próprio boundary também imprime.
    console.error = jest.fn();
  });

  afterEach(() => {
    console.error = erroOriginal;
  });

  it("manda a árvore de componentes junto, que é o que nomeia a tela quebrada", () => {
    render(
      <AppErrorBoundary>
        <TelaQueQuebra />
      </AppErrorBoundary>,
    );

    expect(report).toHaveBeenCalledTimes(1);
    const enviado = report.mock.calls[0][0] as { stack?: string };

    expect(enviado.stack).toContain("--- component stack ---");
    /*
      O nome do componente que estava renderizando precisa chegar ao
      plantão. É literalmente a informação que faltou em 07/10: sem
      ela, "Element type is invalid" é indistinguível entre qualquer
      uma das dezenas de telas do app.
    */
    expect(enviado.stack).toContain("TelaQueQuebra");
  });

  it("diz qual build quebrou", () => {
    render(
      <AppErrorBoundary>
        <TelaQueQuebra />
      </AppErrorBoundary>,
    );

    /*
      Em ambiente de teste não existe configuração nativa, então o valor
      pode ser indefinido. O que este teste prende é que o campo É
      CALCULADO E ENVIADO: antes do conserto ele nem aparecia na
      chamada, e um relatório sem build é um relatório que não dá para
      cruzar com um envio da Play Store.
    */
    expect(Object.keys(report.mock.calls[0][0] as object)).toContain("buildId");
  });

  it("mostra a tela de erro para o usuário em vez de sumir", () => {
    const { getByText } = render(
      <AppErrorBoundary>
        <TelaQueQuebra />
      </AppErrorBoundary>,
    );

    expect(getByText("Algo deu errado")).toBeTruthy();
  });

  it("não reporta nada quando a árvore renderiza normalmente", () => {
    const { getByText } = render(
      <AppErrorBoundary>
        <Text>tudo certo</Text>
      </AppErrorBoundary>,
    );

    expect(getByText("tudo certo")).toBeTruthy();
    expect(report).not.toHaveBeenCalled();
  });
});

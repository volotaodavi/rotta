import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { render, waitFor } from "@testing-library/react-native";
import { Text } from "react-native";

import { navegacaoRef, telaAtual } from "../tela-atual";

/**
 * O relatório de erro tem que dizer QUAL tela quebrou.
 *
 * ## Por que isto é testado
 *
 * Porque a ausência disso custou caro. Até 13/10/2026 todo crash do app
 * chegava ao plantão com a tela `"(mobile)"` — uma constante, igual
 * para as 96 telas. O fundador relatou duas vezes, em dias diferentes,
 * que uma aba não abria; o plantão mostrou seis ocorrências de "Element
 * type is invalid ... got: undefined" e nenhuma delas dizia onde.
 *
 * A justificativa escrita no código era que um `navigationRef` global
 * "seria uma mudança maior/mais arriscada", e que a pilha teria a tela
 * real. A pilha não tem: em produção o código vira bytecode Hermes e os
 * quadros são endereços, e um erro nascido dentro do reconciliador do
 * React não tem nenhum quadro do produto.
 */

const Stack = createNativeStackNavigator();

function TelaFalsa(): JSX.Element {
  return <Text>conteudo</Text>;
}

describe("telaAtual", () => {
  it("devolve null antes de a navegação montar, sem lançar", () => {
    /*
      Chamado de dentro de um Error Boundary: se o app quebrar ANTES de
      a navegação existir, isto não pode ser o que derruba a tela de
      erro.
    */
    expect(() => telaAtual()).not.toThrow();
    expect(telaAtual()).toBeNull();
  });

  it("devolve o caminho do navigator raiz até a folha", async () => {
    render(
      <NavigationContainer ref={navegacaoRef}>
        <Stack.Navigator>
          <Stack.Screen name="Notificacoes" component={TelaFalsa} />
        </Stack.Navigator>
      </NavigationContainer>,
    );

    await waitFor(() => {
      expect(navegacaoRef.isReady()).toBe(true);
    });

    /*
      O caminho inteiro, e não só a folha: a mesma stack de notificações
      é montada por quatro navigators diferentes (Responsável, Empresa,
      Motorista, Admin), e "Central" sozinho não diria de qual papel
      veio o crash.
    */
    expect(telaAtual()).toBe("Notificacoes");
  });
});

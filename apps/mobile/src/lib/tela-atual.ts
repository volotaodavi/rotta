import { createNavigationContainerRef } from "@react-navigation/native";

/**
 * Qual tela o usuário estava vendo quando algo quebrou.
 *
 * ## Por que existe, e por que o comentário antigo estava errado
 *
 * O `AppErrorBoundary` sempre mandou `path: "(mobile)"` — uma constante,
 * igual para as 96 telas do app. A nota que justificava isso dizia que
 * um `navigationRef` global "seria uma mudança maior/mais arriscada pra
 * adicionar só por causa disso", e que o `stack` continuaria tendo a
 * tela real.
 *
 * As duas metades estavam erradas. Em build de produção o código vira
 * bytecode Hermes e `error.stack` devolve endereço, não nome de arquivo;
 * quando o erro nasce dentro do reconciliador do React (todo
 * "Element type is invalid"), não existe UM quadro do produto na pilha.
 * E a mudança é este arquivo: um `ref`, uma leitura, nenhuma
 * dependência nova.
 *
 * O preço de não ter feito isso antes: entre 07/10 e 13/10/2026 o
 * fundador relatou duas vezes que uma aba não abria, o plantão mostrou
 * seis ocorrências de "Element type is invalid ... got: undefined", e
 * todas chegaram com `telas: ["(mobile)"]`. Seis relatórios, nenhum
 * dizendo onde.
 *
 * ## Por que nunca lança
 *
 * É chamado de dentro de um Error Boundary, que é o último lugar do app
 * onde se pode deixar escapar uma exceção. Se a navegação ainda não
 * montou, ou se o estado interno mudou de forma entre versões do
 * react-navigation, devolve `null` e o chamador usa o que tiver.
 */
export const navegacaoRef = createNavigationContainerRef();

/**
 * O caminho da tela ativa, do navigator raiz até a folha, como
 * `Notificacoes > Central`. O caminho inteiro e não só a folha, porque
 * "Central" sozinho não diz de qual aba, e a mesma stack é montada por
 * quatro navigators diferentes.
 */
export function telaAtual(): string | null {
  try {
    if (!navegacaoRef.isReady()) return null;

    const estado = navegacaoRef.getRootState();
    const partes: string[] = [];

    /*
      Desce pelo estado aninhado seguindo sempre a rota em foco. O teto
      de profundidade é defesa contra estado malformado: um laço infinito
      aqui transformaria a tela de erro em travamento, que é pior que o
      erro original.
    */
    let atual: { index?: number; routes?: { name: string; state?: unknown }[] } | undefined =
      estado;
    for (let nivel = 0; nivel < 10 && atual?.routes; nivel += 1) {
      const rota = atual.routes[atual.index ?? atual.routes.length - 1];
      if (!rota) break;
      partes.push(rota.name);
      atual = rota.state as typeof atual;
    }

    return partes.length > 0 ? partes.join(" > ") : null;
  } catch {
    return null;
  }
}

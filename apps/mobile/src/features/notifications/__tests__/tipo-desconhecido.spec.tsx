import { iconeDoTipo, rotuloDoTipo, tomDoTipo } from "../labels";

import type { NotificationEventType } from "@rotta/api-client";

/**
 * O defeito de 07/10/2026, prendido no ponto exato onde ele nasceu.
 *
 * ## O que aconteceu
 *
 * Um usuário abriu a Central de Notificações e o app mostrou "Algo deu
 * errado", duas vezes em doze segundos. O erro registrado foi "Element
 * type is invalid: expected a string (for built-in components) or a
 * class/function (for composite components) but got: undefined".
 *
 * A causa: a tela fazia `NOTIFICATION_TYPE_ICON[notification.tipo]` e
 * renderizava o resultado como componente. O mapa tinha 26 tipos; o
 * `enum NotificationEventType` do banco tinha 45. Chegando um dos 19
 * que faltavam — e `CADASTRO_CONCLUIDO` e `IDENTIDADE_APROVADA` estão
 * entre eles, das primeiras notificações de qualquer conta nova — a
 * busca devolvia `undefined`, e `<undefined />` derruba a árvore.
 *
 * O compilador não pegou porque a união `NotificationEventType` do
 * `api-client` também estava em 26: um `Record` de 26 chaves estava,
 * para o TypeScript, completo.
 *
 * ## Por que o teste é sobre tipo DESCONHECIDO e não sobre os 19
 *
 * Porque os 19 agora estão nos mapas e travados por `tsc` mais o
 * `notification-event-type.spec.ts` do `api-client`. O que nenhum dos
 * dois alcança é o aparelho: a API sobe sozinha, o aplicativo
 * instalado só muda quando a pessoa atualiza pela loja. No dia em que
 * alguém adicionar o quadragésimo sexto valor ao enum, todo celular com
 * a versão anterior vai receber um tipo fora dos mapas.
 *
 * Então o que precisa ficar trancado não é a lista, é o comportamento
 * diante do desconhecido: devolver algo renderizável, sempre.
 */

/** Um tipo que esta versão do app não conhece, como o enum do banco fará um dia. */
const TIPO_DO_FUTURO = "ALGO_QUE_AINDA_NAO_EXISTE" as NotificationEventType;

describe("tipo de notificação que esta versão do app não conhece", () => {
  it("devolve um componente de ícone renderizável, nunca undefined", () => {
    const Icone = iconeDoTipo(TIPO_DO_FUTURO);

    expect(Icone).toBeDefined();
    /*
      A verificação que importa é esta: o React aceita função ou string
      como tipo de elemento, e rejeita tudo o mais. Era exatamente aqui
      que `undefined` passava.
    */
    expect(["function", "object"]).toContain(typeof Icone);
  });

  it("devolve um tom de cor que o tema sabe resolver", () => {
    expect(tomDoTipo(TIPO_DO_FUTURO)).toBe("muted");
  });

  it("devolve um rótulo legível em vez de vazio", () => {
    expect(rotuloDoTipo(TIPO_DO_FUTURO)).toBe("Notificação");
  });

  it("não atropela o tipo conhecido: cada um mantém o seu", () => {
    /*
      Uma implementação que devolvesse o padrão para tudo passaria nos
      três testes acima. Este fecha a porta.
    */
    expect(tomDoTipo("EMERGENCIA")).toBe("danger");
    expect(rotuloDoTipo("CADASTRO_CONCLUIDO")).toBe("Cadastro concluído");
    expect(iconeDoTipo("EMERGENCIA")).not.toBe(iconeDoTipo(TIPO_DO_FUTURO));
  });
});

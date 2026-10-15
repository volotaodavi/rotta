import appConfig from "../../../app.config";
import { identidadeDoBuild, VERSAO_NO_CODIGO } from "../identidade-do-build";

jest.mock("expo-constants", () => ({ __esModule: true, default: { expoConfig: null } }));

/**
 * A identidade do build não pode voltar a sair vazia, e não pode
 * divergir do `app.config.ts`.
 *
 * ## Por que estes testes existem
 *
 * Entre 07/10 e 13/10/2026 seis relatórios de crash chegaram ao plantão
 * com `buildId` vazio, todos de um pacote que já continha o código que
 * preenche esse campo. A causa: `Constants.expoConfig` é
 * `ExpoConfig | null` e vem nulo no build de produção deste app, e a
 * função devolvia `undefined` nesse caso.
 *
 * O custo real não foi o campo vazio, foi a AMBIGUIDADE: um relatório
 * sem build podia significar "aparelho com versão antiga do app" ou
 * "código rodou e não achou a configuração", e as duas levavam a
 * investigações opostas.
 */
describe("identidadeDoBuild", () => {
  it("nunca devolve vazio, mesmo sem configuração nativa", () => {
    /* O mock acima é o caso real do build de produção: `expoConfig` nulo. */
    const id = identidadeDoBuild();

    expect(id).toBeTruthy();
    expect(id.length).toBeGreaterThan(0);
  });

  it("diz que a versão veio da constante, e não da configuração", () => {
    /*
      O sufixo é o que desfaz a ambiguidade: vendo `codigo` no plantão,
      sabe-se que o app é atual e que `Constants.expoConfig` está nulo.
      Sem ele, a informação se perde de novo.
    */
    expect(identidadeDoBuild()).toBe(`${VERSAO_NO_CODIGO} codigo`);
  });

  it("a versão no código é a mesma do app.config.ts", () => {
    /*
      Importa a configuração de verdade em vez de ler o arquivo como
      texto: o `tsc` do app não carrega os tipos do Node, e comparar
      objeto com objeto é mais honesto que casar expressão regular.

      Trava contra deriva: subir a versão do app sem subir a constante
      faria todo relatório de crash apontar para a versão errada, que é
      pior que não apontar para nenhuma.
    */
    expect(VERSAO_NO_CODIGO).toBe(appConfig().version);
  });
});

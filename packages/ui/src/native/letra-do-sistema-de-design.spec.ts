import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Nenhum componente compartilhado desenha na fonte do sistema.
 *
 * ## Por que este teste existe
 *
 * Porque a troca de letra chegou às telas do aplicativo e quase não
 * chegou aos componentes que elas usam. `StatusPill` e `SlideToAction`
 * ficaram desenhando em Roboto no Android e SF Pro no iOS, dentro de
 * telas em Plus Jakarta Sans: a etiqueta de estado, que aparece em
 * quase toda tela do produto, era de outra família que o resto.
 *
 * E nada quebrou por causa disso. Não tem erro, não tem aviso, não tem
 * teste vermelho: um `<Text>` sem fonte simplesmente herda a do
 * sistema. Dá para notar olhando um print com atenção, e foi assim que
 * apareceu.
 *
 * Então a regra vale para o pacote inteiro, verificada no fonte: todo
 * texto de `@rotta/ui/native` passa por `Texto`, que resolve a família
 * (do `fontFamily` explícito ou do `fontWeight`). Um `<Text>` cru novo
 * quebra esta verificação, que é exatamente o que se quer.
 */
const PACOTE = __dirname;

function arquivosTsx(diretorio: string): string[] {
  return readdirSync(diretorio).flatMap((nome: string) => {
    const caminho = join(diretorio, nome);
    if (statSync(caminho).isDirectory()) return arquivosTsx(caminho);
    return nome.endsWith(".tsx") ? [caminho] : [];
  });
}

describe("letra do sistema de design nativo", () => {
  const arquivos = arquivosTsx(PACOTE);

  it("encontra os componentes do pacote", () => {
    /* Se o caminho mudar, os testes abaixo passariam vazios e a
       verificação viraria enfeite. */
    expect(arquivos.length).toBeGreaterThan(10);
  });

  it("nenhum componente usa <Text> cru", () => {
    const culpados = arquivos.filter((caminho) => {
      /* `Texto` é o único que pode: é ele que embrulha o `Text` do
         React Native e aplica a família. */
      if (caminho.includes(join("atoms", "Texto"))) return false;
      return /<Text[\s>/]/.test(readFileSync(caminho, "utf8"));
    });

    expect(culpados.map((c) => c.replace(PACOTE, ""))).toEqual([]);
  });

  it("nenhum componente pede peso sem escolher família", () => {
    /*
      Com fonte própria, `fontWeight` sozinho não deixa o texto em
      negrito: o React Native engrossa por software o arquivo regular,
      e sai o borrão. Dentro do pacote a família é sempre explícita
      (`fontFamily: fonteNativa(600)`), e o peso não entra — quem usa
      peso são as telas do aplicativo, onde `Texto` faz a derivação.
    */
    const culpados = arquivos.filter((caminho) => {
      const fonte = readFileSync(caminho, "utf8");
      return /fontWeight:/.test(fonte) && !/fonteNativa\(/.test(fonte);
    });

    expect(culpados.map((c) => c.replace(PACOTE, ""))).toEqual([]);
  });
});

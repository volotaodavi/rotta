import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * A marca do produto é o arquivo oficial, em toda plataforma.
 *
 * ## Por que este teste existe
 *
 * Porque o logotipo já estava no repositório e mesmo assim apareceu
 * desenhado à mão em dois lugares: um "R" em Bricolage Grotesque numa
 * prévia, e a palavra "ROTTA" digitada em caixa alta na fonte da
 * interface dentro do app, no lugar da assinatura. A assinatura da
 * Rotta é "Rotta" em caixa mista, com o ponto azul à esquerda do "R":
 * o que estava sendo mostrado era outra palavra, em outra letra.
 *
 * Nenhum dos dois quebrava nada. Logotipo errado não dá erro de
 * compilação nem teste vermelho, só sai errado na tela de quem usa.
 *
 * Então a verificação é sobre os BYTES: o símbolo e a assinatura que o
 * app carrega têm que ser exatamente os mesmos arquivos que o site
 * carrega. Divergiram uma vez (o site e o painel ficaram com uma
 * versão antiga, com gradiente e canto arredondado assados na imagem,
 * enquanto o app já tinha a oficial), e foi assim que se descobriu.
 */
const RAIZ = join(__dirname, "..", "..", "..", "..");

function digest(...caminho: string[]): string {
  return createHash("sha256")
    .update(readFileSync(join(RAIZ, ...caminho)))
    .digest("hex");
}

/** Largura e altura lidas do IHDR do PNG (bytes 16..24), sem biblioteca de imagem. */
function dimensoes(...caminho: string[]): { largura: number; altura: number } {
  const bytes = readFileSync(join(RAIZ, ...caminho));
  return { largura: bytes.readUInt32BE(16), altura: bytes.readUInt32BE(20) };
}

describe("marca oficial", () => {
  it("a assinatura do app é o mesmo arquivo da assinatura do site", () => {
    expect(digest("apps", "mobile", "assets", "rotta-wordmark.png")).toBe(
      digest("apps", "web", "public", "brand", "rotta-wordmark-dark.png"),
    );
    expect(digest("apps", "mobile", "assets", "rotta-wordmark-claro.png")).toBe(
      digest("apps", "web", "public", "brand", "rotta-wordmark-light.png"),
    );
  });

  it("o símbolo da splash é o mesmo recorte do ícone adaptativo", () => {
    /* Os dois são o "R" branco com o ponto azul, recortados em
       transparência. `splash-icon.png` carregava a versão antiga com
       gradiente e sombra, que era a que aparecia dentro do app. */
    expect(digest("apps", "mobile", "assets", "splash-icon.png")).toBe(
      digest("apps", "mobile", "assets", "adaptive-icon.png"),
    );
  });

  it("o ícone quadrado do site vem da pasta brand, sem passar por edição", () => {
    expect(digest("apps", "web", "public", "brand", "rotta-mark.png")).toBe(
      digest("brand", "rotta-marca-1024.png"),
    );
  });

  it("os tamanhos derivados do ícone são quadrados e têm o tamanho que o nome promete", () => {
    /*
      Aqui a comparação é de DIMENSÃO, e não de bytes: `icon.png` e os
      tamanhos derivados saem de codificadores diferentes, então dois
      arquivos com exatamente os mesmos pixels têm bytes diferentes. O
      que dá pra afirmar sem uma biblioteca de imagem é o cabeçalho
      IHDR, que já pega o erro real: arquivo trocado por outro de outro
      tamanho, ou um derivado que ninguém regerou.
    */
    const esperado: Array<[string[], number]> = [
      [["apps", "web", "public", "brand", "rotta-mark-512.png"], 512],
      [["apps", "web", "public", "brand", "rotta-mark-192.png"], 192],
      [["apps", "admin", "public", "brand", "rotta-mark-512.png"], 512],
      [["brand", "rotta-marca-1024.png"], 1024],
      [["apps", "mobile", "assets", "icon.png"], 1024],
    ];

    for (const [caminho, lado] of esperado) {
      expect({ arquivo: caminho.join("/"), ...dimensoes(...caminho) }).toEqual({
        arquivo: caminho.join("/"),
        largura: lado,
        altura: lado,
      });
    }
  });

  it("a pasta brand guarda os originais entregues pelo fundador", () => {
    /* Sem os originais versionados, a próxima pessoa que precisar do
       logotipo vai desenhar um, que foi exatamente o que aconteceu. */
    for (const arquivo of ["rotta-marca.jpg", "rotta-assinatura.jpg", "README.md"]) {
      expect(() => readFileSync(join(RAIZ, "brand", arquivo))).not.toThrow();
    }
  });
});

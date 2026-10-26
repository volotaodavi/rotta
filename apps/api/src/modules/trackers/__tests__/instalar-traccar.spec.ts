import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * O `traccar.xml` que `infra/rastreadores/instalar.sh` gera.
 *
 * ## Por que um teste de script de infraestrutura vive aqui
 *
 * Porque a outra ponta desta configuração é `TrackersController`, no
 * mesmo módulo. O script existe só para fazer o Traccar entregar
 * posição NESTE endpoint, e os três defeitos que já apareceram nele
 * eram invisíveis até alguém subir uma VM:
 *
 * 1. `forward.enable`, que não existe na lista de chaves do Traccar e
 *    era ignorada em silêncio.
 * 2. O download de uma versão "latest" que responde 404.
 * 3. `database.registerUnknown` ausente: por padrão o Traccar RECUSA
 *    aparelho que não conhece, escreve `Unknown device` no log e não
 *    encaminha nada. O rastreador conectava e a Rotta não recebia uma
 *    posição sequer.
 *
 * Nenhum dos três quebrava teste nenhum. Agora quebram.
 *
 * ## O que este teste faz de verdade
 *
 * Expande o heredoc com o próprio `bash`, em vez de ler o arquivo como
 * texto. É a única forma de pegar a quarta armadilha, que já esteve
 * presente: o heredoc NÃO é citado (`<<XML`), então crase dentro dele
 * vira execução de comando e barra invertida some. Um comentário
 * inocente com `` `database.registerUnknown.regex` `` apagava parte do
 * XML e rodava um comando inexistente durante a instalação.
 */

const CAMINHO_DO_SCRIPT = join(__dirname, "../../../../../../infra/rastreadores/instalar.sh");

const SCRIPT = readFileSync(CAMINHO_DO_SCRIPT, "utf8");

/** O corpo do heredoc que vira `conf/traccar.xml`. */
function corpoDoHeredoc(): string {
  const casamento = /sudo tee "\$CONF" >\/dev\/null <<XML\n([\s\S]*?)\nXML\n/.exec(SCRIPT);
  if (!casamento?.[1]) throw new Error("Heredoc do traccar.xml não encontrado no script.");
  return casamento[1];
}

/** O XML como ele sai na VM, com as variáveis já substituídas pelo bash. */
function xmlGerado(): string {
  const script = [
    'API_URL="https://api.exemplo.com/v1"',
    'SEGREDO="SEGREDO_DE_TESTE"',
    "cat <<XML",
    corpoDoHeredoc(),
    "XML",
    "",
  ].join("\n");
  return execFileSync("bash", ["-c", script], { encoding: "utf8" });
}

/** O valor de uma chave do `traccar.xml`, ou `null` quando a chave não existe. */
function valorDaChave(xml: string, chave: string): string | null {
  const casamento = new RegExp(`<entry key='${chave.replace(/\./g, "\\.")}'>([^<]*)</entry>`).exec(
    xml,
  );
  return casamento ? (casamento[1] ?? "") : null;
}

describe("o traccar.xml gerado", () => {
  it("aceita aparelho que o Traccar ainda não conhece", () => {
    // Sem esta chave, `ConnectionManager` cai no ramo que escreve
    // "Unknown device - <IMEI>" e devolve `null`. Sem sessão de
    // aparelho o decodificador nunca produz uma posição, e o
    // encaminhamento nunca acontece: o rastreador conecta e a Rotta
    // não recebe nada. Era o defeito que travava a cadeia inteira.
    expect(valorDaChave(xmlGerado(), "database.registerUnknown")).toBe("true");
  });

  it("encaminha em JSON para o endpoint de posições da Rotta", () => {
    const xml = xmlGerado();

    expect(valorDaChave(xml, "forward.type")).toBe("json");
    expect(valorDaChave(xml, "forward.url")).toBe("https://api.exemplo.com/v1/trackers/posicoes");
    expect(valorDaChave(xml, "forward.header")).toBe("X-Rotta-Tracker-Token: SEGREDO_DE_TESTE");
  });

  it("não escreve `forward.enable`, que não existe no Traccar", () => {
    // Chave inventada é ignorada em silêncio pelo Traccar, o que faz
    // parecer configurado o que não está.
    expect(valorDaChave(xmlGerado(), "forward.enable")).toBeNull();
  });

  it("reentrega o que falhar, porque a API nunca responde 4xx", () => {
    const xml = xmlGerado();

    expect(valorDaChave(xml, "forward.retry.enable")).toBe("true");
    expect(valorDaChave(xml, "forward.retry.count")).toBe("10");
  });

  it("sai sem erro e com todas as entradas fechadas", () => {
    const xml = xmlGerado();

    // Toda `<entry` tem o seu `</entry>`: o heredoc não comeu nada.
    expect((xml.match(/<entry /g) ?? []).length).toBe((xml.match(/<\/entry>/g) ?? []).length);
    expect(xml).toContain("</properties>");
  });

  it("o heredoc não tem crase nem barra invertida", () => {
    // `<<XML` sem aspas: crase vira execução de comando durante a
    // instalação, e barra invertida é engolida. As duas coisas
    // corrompem o XML em silêncio, e `bash -n` não pega nenhuma.
    const corpo = corpoDoHeredoc();

    expect(corpo).not.toContain("`");
    expect(corpo).not.toContain("\\");
  });
});

/**
 * O script sem os comentários.
 *
 * Existe porque o comentário no topo CITA a URL quebrada, para explicar
 * o defeito a quem for mexer. Procurar a citação no arquivo inteiro
 * acusaria a explicação como se fosse o defeito.
 */
const SCRIPT_EXECUTAVEL = SCRIPT.split("\n")
  .filter((linha) => !linha.trimStart().startsWith("#"))
  .join("\n");

describe("o download do Traccar", () => {
  it("usa uma versão fixa, nunca `latest`", () => {
    // `.../releases/latest/download/traccar-linux-64-latest.zip`
    // responde 404: o asset publicado tem a versão no nome. O script
    // baixava esse endereço e falhava em silêncio.
    expect(SCRIPT_EXECUTAVEL).not.toContain("traccar-linux-64-latest.zip");
    expect(SCRIPT).toMatch(/TRACCAR_VERSION:-\d+\.\d+\.\d+/);
  });

  it("monta a URL a partir da versão, nos dois lugares", () => {
    const versao = /TRACCAR_VERSION:-(\d+\.\d+\.\d+)/.exec(SCRIPT)?.[1];
    expect(versao).toBeDefined();

    // A URL tem de ser derivada, nunca escrita à mão com o número
    // repetido: versão trocada num lugar só é o próximo 404.
    expect(SCRIPT).toContain(
      "releases/download/v${TRACCAR_VERSION}/traccar-linux-64-${TRACCAR_VERSION}.zip",
    );
  });

  it("confere o HTTP antes de baixar", () => {
    // Sem isto, uma versão inexistente vira um arquivo de poucos bytes
    // com "Not Found" dentro, e o erro só aparece no unzip, dizendo
    // outra coisa.
    expect(SCRIPT).toContain("%{http_code}");
    expect(SCRIPT).toMatch(/CODIGO.*!=\s*"200"/s);
  });
});

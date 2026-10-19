import Constants from "expo-constants";

/**
 * A versão do app declarada no código, espelho de `version` em
 * `app.config.ts`. `identidade-do-build.spec.ts` trava as duas, então
 * subir a versão lá sem subir aqui quebra um teste.
 *
 * Existe porque `Constants.expoConfig` é `ExpoConfig | null`, e em
 * 13/10/2026 ficou provado que ele vem nulo no build de produção deste
 * app: seis relatórios de crash chegaram ao plantão com `buildId`
 * vazio, todos de um pacote que já continha o código que preenche esse
 * campo.
 */
export const VERSAO_NO_CODIGO = "1.4.0";

/**
 * Qual build do app está rodando. NUNCA devolve vazio.
 *
 * ## O defeito que isto conserta, que era do instrumento
 *
 * A primeira versão desta função lia só `Constants.expoConfig` e
 * devolvia `undefined` quando ele não tinha o que ela queria. O
 * resultado é que um relatório de crash sem `buildId` tinha duas
 * leituras indistinguíveis: ou o aparelho rodava uma versão antiga do
 * app (sem este código), ou o código rodou e não achou a configuração.
 *
 * Isso não é detalhe: foi exatamente essa ambiguidade que fez perder
 * uma noite de investigação em 13/10/2026, com o fundador relatando
 * uma aba que não abria e o plantão incapaz de dizer em qual build.
 *
 * Então agora o campo é sempre preenchido, e o SUFIXO diz de onde veio:
 *
 * - `1.3.0 (2000000042) cfg` — a configuração nativa respondeu, é o
 *   caso bom e o número entre parênteses é o `versionCode` que a Play
 *   Store conhece.
 * - `1.3.0 cfg-sem-codigo` — a configuração existe mas não trouxe o
 *   `versionCode`.
 * - `1.3.0 codigo` — a configuração não existe; a versão veio da
 *   constante acima. Ver `buildId` assim é o sinal de que
 *   `Constants.expoConfig` está nulo neste build, e não de que o app
 *   está desatualizado.
 *
 * Um relatório nunca mais pode ficar anônimo por falha de leitura.
 */
export function identidadeDoBuild(): string {
  try {
    const config = Constants.expoConfig;
    if (config) {
      const versao = config.version ?? VERSAO_NO_CODIGO;
      /*
        `versionCode` (Android) e `buildNumber` (iOS) vivem em ramos
        diferentes da configuração. Ler os dois custa uma linha e evita
        que o relatório do iOS nasça anônimo quando ele existir.
      */
      const codigo = config.android?.versionCode ?? config.ios?.buildNumber;
      return codigo != null ? `${versao} (${codigo}) cfg` : `${versao} cfg-sem-codigo`;
    }
  } catch {
    /*
      Engolido de propósito: isto é chamado de dentro de um Error
      Boundary, o último lugar do app onde se pode deixar escapar uma
      exceção. A constante abaixo é resposta suficiente.
    */
  }

  return `${VERSAO_NO_CODIGO} codigo`;
}

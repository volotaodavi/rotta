import Constants from "expo-constants";

/**
 * Qual build do app está rodando, em uma linha curta.
 *
 * ## Por que existe
 *
 * Em 07/10/2026 o app quebrou na mão de um usuário com
 * "Element type is invalid ... but got: undefined", e o plantão do CTO
 * recebeu o relatório com `buildId` vazio. Sem saber QUAL build quebrou,
 * não dá para dizer se o defeito está no código de hoje ou num pacote
 * que já foi substituído, e a investigação começa no escuro.
 *
 * O campo `buildId` do relatório de erro existe desde sempre
 * (`CreateClientErrorReportInput`) e é usado pela Web, que o calcula do
 * HTML servido. O app nunca mandou o dele.
 *
 * ## Formato
 *
 * `1.3.0 (2000000042)`: o `version` que o usuário vê na loja e o
 * `versionCode`/`buildNumber` que identifica o envio. Os dois juntos,
 * porque `version` sozinho repete entre envios e `versionCode` sozinho
 * não diz nada para uma pessoa lendo o plantão.
 *
 * Quando a configuração nativa não está disponível (Expo Go, ou um
 * campo ausente), devolve o que conseguiu, e `undefined` se não
 * conseguiu nada. Nunca lança: isto é chamado de dentro de um Error
 * Boundary, que é o último lugar do app onde se pode deixar escapar uma
 * exceção.
 */
export function identidadeDoBuild(): string | undefined {
  try {
    const config = Constants.expoConfig;
    const version = config?.version;
    /*
      `versionCode` (Android) e `buildNumber` (iOS) vivem em ramos
      diferentes da configuração. O app da Rotta hoje é Android, mas ler
      os dois custa uma linha e evita que o relatório do iOS nasça
      anônimo quando ele existir.
    */
    const codigo = config?.android?.versionCode ?? config?.ios?.buildNumber;

    if (version && codigo != null) return `${version} (${codigo})`;
    if (version) return version;
    if (codigo != null) return String(codigo);
    return undefined;
  } catch {
    return undefined;
  }
}

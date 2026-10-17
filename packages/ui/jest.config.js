/**
 * Testes de fonte do pacote — mesma configuração enxuta de
 * `@rotta/validators`: `ts-jest` em ambiente `node`, sem jsdom e sem
 * `react-native-preset`. O que se verifica aqui é o FONTE dos
 * componentes (que nenhum deles desenhe na letra do sistema), e não o
 * que eles renderizam; render de componente nativo é testado em
 * `apps/mobile`, que tem o preset do React Native.
 *
 * @type {import('jest').Config}
 */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  rootDir: ".",
  testRegex: ".*\\.spec\\.ts$",
};

/**
 * Auditoria minuciosa 04/09/2026 — "@rotta/mobile" nunca teve nenhum
 * teste automatizado (`test` era só um `echo`). `jest-expo` é o preset
 * oficial da Expo (cuida das transforms Babel/Flow do próprio
 * `react-native`, que o `ts-jest` sozinho não sabe compilar).
 * @type {import('jest').Config}
 */
module.exports = {
  preset: "jest-expo",
  testMatch: ["<rootDir>/src/**/*.spec.tsx", "<rootDir>/src/**/*.spec.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    /*
      `lucide-react-native` (por baixo de `@rotta/icons/native`) declara
      `"react-native": "./dist/esm/lucide-react-native.mjs"` no campo
      `exports`, e o `jest-expo` resolve por essa condição. O transform
      do preset, porém, só casa `\.[jt]sx?$`: o `.mjs` chegava ao Jest
      sem passar por Babel e estourava em
      `SyntaxError: Unexpected token 'export'`. Mexer em
      `transformIgnorePatterns` não resolve, porque o problema não é o
      arquivo estar na lista de ignorados, é a extensão não casar com
      transformer nenhum.

      Então o teste usa o build CommonJS do próprio pacote, que o Jest
      executa direto. `require.resolve` com a condição `require` acha
      esse caminho sem a gente escrever a versão nem o diretório da
      virtual store do pnpm; `paths` aponta para `packages/icons`
      porque é lá que a dependência é declarada, não aqui.

      ISTO NÃO É DETALHE DE FERRAMENTA. Enquanto não existia, nada que
      importasse `@rotta/icons/native` podia ser testado, e é por baixo
      desse barrel que vivem os mapas de ícone por tipo de notificação.
      Eles ficaram com 26 entradas contra os 45 tipos do banco até
      derrubarem a Central de Notificações na mão de um usuário em
      07/10/2026. A ausência de teste não foi descuido: era impossível
      escrever o teste que teria pegado.
    */
    "^lucide-react-native$": require.resolve("lucide-react-native", {
      paths: [require("node:path").join(__dirname, "../../packages/icons")],
    }),
  },
  // `transformIgnorePatterns` padrão do `jest-expo` assume node_modules
  // "achatado" (npm/yarn) — quebra com a estrutura de virtual store do
  // pnpm (`node_modules/.pnpm/<pkg>@<versao>/node_modules/<pkg>/...`),
  // onde o PRIMEIRO segmento `node_modules/.pnpm/...` já casa com o
  // padrão de "ignorar" antes de alcançar o nome real do pacote —
  // resultado: `@react-native/js-polyfills` (Flow, sem transform) quebra
  // o parse. Mesma lista do preset, só com `\.pnpm` adicionado à
  // alternância pra não barrar nesse primeiro segmento.
  transformIgnorePatterns: [
    "node_modules/(?!(\\.pnpm|(jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg)",
    "node_modules/react-native-reanimated/plugin/",
  ],
};

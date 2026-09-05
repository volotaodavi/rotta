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

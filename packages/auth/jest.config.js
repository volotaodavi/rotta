/**
 * Auditoria minuciosa 04/09/2026 — "@rotta/auth" nunca teve testes
 * (`test` era só um `echo`), apesar de conter a lógica de sessão mais
 * sensível do projeto (token em memória, refresh proativo, coordenação
 * entre abas com lock+TTL — ver a nota completa em
 * `src/web/token-store.ts` sobre o bug real de produção que essa
 * coordenação corrigiu). Dois test environments coexistem no mesmo
 * pacote porque `src/web` usa `window`/`localStorage`/`BroadcastChannel`
 * (precisa de `jsdom`) e `src/native` é puro Node + mocks de
 * `expo-secure-store` (não precisa de DOM).
 * @type {import('jest').Config}
 */
module.exports = {
  preset: "ts-jest",
  rootDir: ".",
  testRegex: ".*\\.spec\\.ts$",
  projects: [
    {
      displayName: "web",
      preset: "ts-jest",
      testEnvironment: "jsdom",
      testMatch: ["<rootDir>/src/web/**/*.spec.ts"],
    },
    {
      displayName: "native",
      preset: "ts-jest",
      testEnvironment: "node",
      testMatch: ["<rootDir>/src/native/**/*.spec.ts"],
    },
  ],
};

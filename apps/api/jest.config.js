/**
 * Configuracao Jest da Core API — Dossie 12, Secao 9 (piramide de
 * testes). Cobre unidade e integracao; E2E usa `test/jest-e2e.json`
 * separadamente (Dossie 12, Secao 9.1 — niveis fisicamente separados por
 * velocidade de execucao).
 * @type {import('jest').Config}
 */
module.exports = {
  moduleFileExtensions: ["js", "json", "ts"],
  rootDir: ".",
  testRegex: ".*\\.spec\\.ts$",
  transform: {
    "^.+\\.(t|j)s$": "ts-jest",
  },
  collectCoverageFrom: ["src/**/*.(t|j)s"],
  coverageDirectory: "./coverage",
  testEnvironment: "node",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
};

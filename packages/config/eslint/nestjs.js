/**
 * Preset de ESLint para o backend NestJS (apps/api, apps/realtime-gateway,
 * apps/worker).
 * @type {import("eslint").Linter.Config}
 */
module.exports = {
  root: false,
  extends: ["./base.js", "plugin:@typescript-eslint/recommended-requiring-type-checking"],
  parserOptions: {
    project: true,
  },
  rules: {
    // Decorators do NestJS (@Injectable, @Controller) usam classes com
    // metodos que podem nao referenciar `this` — nao e um code smell aqui.
    "@typescript-eslint/no-extraneous-class": "off",
    "@typescript-eslint/explicit-module-boundary-types": "off",

    // Toda regra de negocio numerada (RN-*) deve ser rastreavel a um teste
    // unitario correspondente (Dossie 12, Secao 9.2) — nao ha regra de lint
    // automatizada para isso; e verificado em revisao de codigo.
  },
};

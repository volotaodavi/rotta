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
  overrides: [
    {
      // Regras `no-unsafe-*`/`unbound-method` sao valiosas em codigo de
      // producao (pegam vazamento real de `any`), mas geram ruido em
      // testes: corpo de resposta HTTP do supertest (`response.body`) e
      // mocks do Jest (`jest.Mocked<...>`) sao legitimamente pouco
      // tipados por natureza — mesma pratica adotada por presets de
      // referencia da comunidade para arquivos de teste.
      files: ["**/*.spec.ts", "**/*.e2e-spec.ts"],
      rules: {
        "@typescript-eslint/no-unsafe-argument": "off",
        "@typescript-eslint/no-unsafe-assignment": "off",
        "@typescript-eslint/no-unsafe-call": "off",
        "@typescript-eslint/no-unsafe-member-access": "off",
        "@typescript-eslint/unbound-method": "off",
      },
    },
  ],
};

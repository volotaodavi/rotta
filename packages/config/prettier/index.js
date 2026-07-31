/**
 * Preset unico de Prettier do monorepo — Dossie 23, Secao 15.1: "nunca
 * debate de estilo em code review (e resolvido automaticamente)".
 * @type {import("prettier").Config}
 */
module.exports = {
  semi: true,
  singleQuote: false,
  trailingComma: "all",
  printWidth: 100,
  tabWidth: 2,
  useTabs: false,
  arrowParens: "always",
  endOfLine: "lf",
  bracketSpacing: true,
  bracketSameLine: false,
  plugins: [],
};

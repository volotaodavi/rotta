/**
 * Configuracao raiz do ESLint — usada apenas para arquivos soltos na raiz
 * do monorepo (scripts/, arquivos de configuracao). Cada app/package tem
 * seu proprio `.eslintrc.cjs` estendendo o preset apropriado de
 * `packages/config/eslint` (Dossie 23, Secao 15.1) — esta config raiz NAO
 * e herdada automaticamente por eles (cada workspace e independente).
 */
module.exports = {
  root: true,
  extends: ["./packages/config/eslint/base.js"],
  ignorePatterns: ["apps/**", "packages/**", "shared/**", "node_modules/**"],
};

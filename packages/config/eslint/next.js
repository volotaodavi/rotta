/**
 * Preset de ESLint para apps Next.js (apps/web, apps/admin).
 * Estende o preset base (packages/config/eslint/base.js) e adiciona as
 * regras especificas do ecossistema React/Next — Dossie 23, Secao 15.1.
 * @type {import("eslint").Linter.Config}
 */
module.exports = {
  root: false,
  extends: [
    "./base.js",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
    "plugin:jsx-a11y/recommended",
    "next/core-web-vitals",
  ],
  plugins: ["react", "react-hooks", "jsx-a11y"],
  settings: {
    react: { version: "detect" },
  },
  rules: {
    // A11y e requisito de produto, nao apenas boa pratica — Dossie 10, Secao 10.
    "jsx-a11y/anchor-is-valid": "error",
    "react/react-in-jsx-scope": "off",
    "react/prop-types": "off",
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "warn",

    // Nenhum componente visual "solto" fora de packages/ui — Dossie 22, Secao 6.2.
    // A regra concreta de fronteira e configurada por app em seu `.eslintrc.cjs`
    // (boundaries/element-types), pois depende da lista real de `features/`.
  },
};

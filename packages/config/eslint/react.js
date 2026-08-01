/**
 * Preset de ESLint para pacotes React puros, sem Next.js (packages/ui/web).
 * Mesmas regras de React/Hooks/A11y do preset `next.js`, sem
 * `next/core-web-vitals` (que pressupõe uma aplicação Next.js real,
 * não uma biblioteca de componentes consumida por ela).
 * @type {import("eslint").Linter.Config}
 */
module.exports = {
  root: false,
  extends: [
    "./base.js",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
    "plugin:jsx-a11y/recommended",
  ],
  plugins: ["react", "react-hooks", "jsx-a11y"],
  settings: {
    react: { version: "detect" },
  },
  rules: {
    "jsx-a11y/anchor-is-valid": "error",
    "react/react-in-jsx-scope": "off",
    "react/prop-types": "off",
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "warn",
  },
};

/**
 * Preset de ESLint para o app mobile (apps/mobile, React Native/Expo).
 * @type {import("eslint").Linter.Config}
 */
module.exports = {
  root: false,
  extends: [
    "./base.js",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
    "plugin:react-native/all",
  ],
  plugins: ["react", "react-hooks", "react-native"],
  env: {
    "react-native/react-native": true,
  },
  settings: {
    react: { version: "detect" },
  },
  rules: {
    "react/react-in-jsx-scope": "off",
    "react/prop-types": "off",
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "warn",
    // Cores/estilos sempre via packages/theme, nunca valores hexadecimais
    // soltos no componente — reforca o Dossie 22, Secao 5.2.
    "react-native/no-color-literals": "warn",
    "react-native/no-inline-styles": "warn",
    "react-native/no-unused-styles": "error",
  },
};

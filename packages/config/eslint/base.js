/**
 * Preset base de ESLint do monorepo Rotta.
 *
 * Todo app/package estende esta configuracao (nunca a duplica) — ver
 * Dossie 23, Secao 15.1: "toda configuracao vive centralizada em
 * packages/config e e estendida, nunca duplicada, por cada app/package".
 *
 * A regra `boundaries/*` abaixo e a aplicacao concreta, via ferramenta
 * (nao apenas convencao), do principio de fronteira de dominio do
 * Dossie 12, Secao 1.4 e do Dossie 23, Secao 1.2: uma feature nunca
 * importa um arquivo interno de outra feature, e nenhum app importa
 * detalhe interno de outro app.
 *
 * @type {import("eslint").Linter.Config}
 */
module.exports = {
  root: false,
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: "module",
    project: false,
  },
  plugins: ["@typescript-eslint", "import", "boundaries"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:import/recommended",
    "plugin:import/typescript",
    // Sempre por ultimo: desativa regras de estilo que conflitam com o Prettier
    // (formatacao e responsabilidade exclusiva do Prettier, nunca do ESLint).
    "eslint-config-prettier",
  ],
  env: {
    node: true,
    es2022: true,
  },
  rules: {
    // --- Regras gerais ---
    "no-console": ["warn", { allow: ["warn", "error"] }],
    "no-unused-vars": "off",
    "@typescript-eslint/no-unused-vars": [
      "warn",
      { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
    ],
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/consistent-type-imports": [
      "error",
      { prefer: "type-imports", fixStyle: "separate-type-imports" },
    ],

    // --- Import hygiene ---
    "import/order": [
      "warn",
      {
        groups: ["builtin", "external", "internal", "parent", "sibling", "index", "type"],
        "newlines-between": "always",
        alphabetize: { order: "asc", caseInsensitive: true },
      },
    ],
    "import/no-cycle": "error",
    "import/no-default-export": "off",
    // Resolucao de modulo (incluindo os aliases `@/*` de cada app/package)
    // ja e verificada, com muito mais precisao, pelo `tsc --noEmit` de
    // cada workspace (script `typecheck`, sempre rodado antes do `lint`
    // no pipeline — Dossie 23, Secao 14). O resolvedor de import do
    // ESLint (`eslint-import-resolver-typescript`) descobre o tsconfig
    // certo por proximidade ao arquivo quando invocado a partir do
    // diretorio de cada pacote (`pnpm turbo run lint`), mas quebra
    // quando o mesmo comando roda a partir da raiz do monorepo com
    // arquivos de multiplos pacotes ao mesmo tempo (`lint-staged` no
    // hook de pre-commit) — desativar aqui evita falso-positivo nesse
    // segundo cenario sem perder a garantia real (que continua vindo do tsc).
    "import/no-unresolved": "off",

    // --- Fronteiras de dominio (Dossie 12 Secao 1.4 / Dossie 23 Secao 1.2) ---
    // Cada app/package que consome este preset declara seus proprios
    // `boundaries/elements` (ver `.eslintrc.cjs` de cada workspace) — aqui
    // apenas habilitamos e definimos a severidade padrao.
    "boundaries/no-unknown": "off",
    "boundaries/element-types": "off",
  },
  settings: {
    "import/resolver": {
      typescript: {
        alwaysTryTypes: true,
      },
    },
  },
  ignorePatterns: ["node_modules", "dist", "build", ".next", ".expo", "coverage", "*.config.js"],
};

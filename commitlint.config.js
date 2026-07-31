/**
 * Conventional Commits — ver Dossiê 23, Secao 12.
 * Tipos e regras seguem @commitlint/config-conventional, com a lista de
 * escopos restrita aos apps/packages reais do monorepo, mantida em sincronia
 * manual com `apps/` e `packages/` (Secao 12.1 do Dossie 23).
 * @type {import('@commitlint/types').UserConfig}
 */
module.exports = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "type-enum": [
      2,
      "always",
      [
        "feat",
        "fix",
        "docs",
        "style",
        "refactor",
        "perf",
        "test",
        "build",
        "ci",
        "chore",
        "revert",
      ],
    ],
    "scope-enum": [
      2,
      "always",
      [
        // apps
        "web",
        "admin",
        "mobile",
        "api",
        "realtime-gateway",
        "worker",
        "docs",
        // packages
        "ui",
        "types",
        "hooks",
        "config",
        "utils",
        "maps",
        "auth",
        "theme",
        "icons",
        "validators",
        "forms",
        "api-client",
        "notifications",
        "storage",
        // transversal
        "shared",
        "infra",
        "repo",
      ],
    ],
    "scope-case": [2, "always", "kebab-case"],
    "subject-case": [2, "never", ["start-case", "pascal-case", "upper-case"]],
    "body-max-line-length": [0, "always", Infinity],
  },
};

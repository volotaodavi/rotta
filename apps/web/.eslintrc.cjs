module.exports = {
  root: true,
  extends: [require.resolve("@rotta/config/eslint/next")],
  // `public/` guarda assets estaticos (ex. `sw.js`, o service worker do
  // PWA) — nunca faz parte do programa TypeScript do app, entao as regras
  // com informacao de tipo (`@typescript-eslint/consistent-type-imports`)
  // nao conseguem resolve-lo.
  ignorePatterns: ["public/**"],
};

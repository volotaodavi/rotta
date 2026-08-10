module.exports = {
  root: true,
  parserOptions: {
    project: "./tsconfig.json",
    tsconfigRootDir: __dirname,
  },
  extends: [require.resolve("@rotta/config/eslint/nestjs")],
  ignorePatterns: [
    ".eslintrc.cjs",
    "dist",
    "node_modules",
    // Script k6 (Dossiê 34) — roda pelo binário externo `k6`, nunca por
    // este monorepo (`k6/http` não é um pacote npm instalável, e o
    // arquivo não está no `include` do tsconfig.json — lintar aqui
    // geraria só erro de parser, não um problema real de código).
    "test/load/**",
  ],
};

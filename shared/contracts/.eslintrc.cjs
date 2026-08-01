module.exports = {
  root: true,
  // require.resolve(...) em vez de string bare — o resolvedor legado de
  // configs do ESLint 8 nao lida bem com pacotes escopados cujo subpath
  // nao segue a convencao `@scope/eslint-config[-x]` (ver
  // packages/config/README.md, "Nota tecnica").
  extends: [require.resolve("@rotta/config/eslint/base")],
};

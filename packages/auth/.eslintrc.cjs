module.exports = {
  root: true,
  // require.resolve(...) em vez de string bare — o resolvedor legado de
  // configs do ESLint 8 nao lida bem com pacotes escopados cujo subpath
  // nao segue a convencao `@scope/eslint-config[-x]` (ver
  // packages/config/README.md, "Nota tecnica").
  //
  // Preset `react` (nao `base`) desde que este pacote passou a conter
  // `AuthProvider`/`useAuth` (Dossie 15) tanto para Web quanto para o
  // app mobile — as regras de `react-hooks` valem para os dois; as de
  // `jsx-a11y` sao inofensivas no lado nativo (nenhum elemento DOM la).
  extends: [require.resolve("@rotta/config/eslint/react")],
};

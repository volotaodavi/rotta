// Fix do build EAS de 10/09/2026 (dois problemas de autolinking Android
// encontrados nesta ordem, ambos gerando o mesmo sintoma no compilador):
//
//   PackageList.java:16: error: cannot find symbol
//   import expo.core.ExpoModulesPackage;
//
// 1) `expo-task-manager@12.0.6` (dependencia oficial do SDK 52) traz
//    `unimodules-app-loader@5.0.1` como dependencia transitiva — um pacote
//    legado (do sistema de "unimodules" anterior ao expo-modules-core,
//    pre-2021) que hoje nao contem nenhum modulo nativo de verdade. O
//    autolinking, so por ver uma pasta `android/` dentro dele, tentava
//    gera-lo mesmo assim. Excluido abaixo — sem perda de funcionalidade,
//    expo-task-manager continua autolinkado normalmente pelo proprio
//    `expo-module.config.json`.
//
// 2) Causa raiz real e mais profunda, reproduzida rodando o resolver do
//    autolinking direto (sem precisar de Gradle/Android SDK):
//    `node --eval "require(require.resolve('expo-modules-autolinking', ...))"
//    react-native-config --json --platform android` — o proprio pacote npm
//    `expo@52.0.49` tem um bug de namespace: `android/build.gradle` declara
//    `namespace "expo.core"`, mas a classe real
//    (`android/src/main/java/expo/modules/ExpoModulesPackage.kt`) esta no
//    pacote Kotlin `expo.modules`. O pacote `expo` tem seu proprio
//    `react-native.config.js` que corrige isso via `packageImportPath`
//    explicito — mas ele depende de `expo-modules-autolinking/exports`
//    resolver corretamente atraves do `require-from-string` com
//    `prependPaths` (mecanismo interno do autolinking pra mockar o
//    `@react-native-community/cli`), o que falha silenciosamente neste
//    projeto (retorna `null`, cai no fallback que le o `namespace` errado
//    do build.gradle). Forcamos aqui o mesmo valor correto que o proprio
//    pacote `expo` pretendia gerar.
module.exports = {
  dependencies: {
    "unimodules-app-loader": {
      platforms: {
        android: null,
        ios: null,
      },
    },
    expo: {
      platforms: {
        android: {
          packageImportPath: "import expo.modules.ExpoModulesPackage;",
        },
      },
    },
  },
};

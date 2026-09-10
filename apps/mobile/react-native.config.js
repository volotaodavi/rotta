// Fix do build EAS de 10/09/2026: `expo-task-manager@12.0.6` (dependencia
// oficial do SDK 52) traz `unimodules-app-loader@5.0.1` como dependencia
// transitiva — um pacote legado (era do sistema de "unimodules" anterior
// ao `expo-modules-core`, pre-2021) que hoje nao contem nenhum modulo
// nativo de verdade. O autolinking do React Native, so por ver uma pasta
// `android/` dentro dele, tenta gera-lo mesmo assim e o build de release
// falhava com:
//
//   PackageList.java:16: error: cannot find symbol
//   import expo.core.ExpoModulesPackage;
//
// (classe que nao existe em nenhum pacote instalado — resquicio do
// autolinking legado, nao um erro de codigo do app). Excluir o pacote do
// autolinking em ambas as plataformas resolve, sem perder nenhuma
// funcionalidade real do `expo-task-manager` (que continua sendo
// autolinkado normalmente pelo seu proprio `expo-module.config.json`).
module.exports = {
  dependencies: {
    "unimodules-app-loader": {
      platforms: {
        android: null,
        ios: null,
      },
    },
  },
};

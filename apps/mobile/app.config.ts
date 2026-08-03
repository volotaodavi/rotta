import type { ExpoConfig } from "expo/config";

/**
 * Configuracao do Expo — um unico aplicativo "Rotta" (Dossie 15: "Existira
 * apenas UM aplicativo... Nunca aplicativos separados por papel"). Decisao
 * que substitui o plano anterior de dois produtos de loja diferenciados por
 * variante de build (Dossie 9, Secao 4.2.1) — o papel do usuario logado
 * (Motorista/Monitor/Responsavel/...) agora e resolvido em tempo de execucao
 * pela sessao real (`@rotta/auth`), nunca por variante de build ou app
 * distinto.
 *
 * Nenhum icone/splash real foi adicionado ainda (fase de fundacao) —
 * `icon`/`splash` serao configurados junto com a identidade visual real
 * do Dossie 10.
 */
export default (): ExpoConfig => ({
  name: "Rotta",
  slug: "rotta",
  scheme: "rotta",
  owner: "rotta",
  version: "0.1.0",
  orientation: "portrait",
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  platforms: ["ios", "android"],
  ios: {
    supportsTablet: false,
    bundleIdentifier: "br.com.rotta.app",
  },
  android: {
    package: "br.com.rotta.app",
    permissions: ["ACCESS_FINE_LOCATION", "ACCESS_BACKGROUND_LOCATION"],
  },
  plugins: [
    "expo-secure-store",
    // MapLibre Native é inteiramente open-source (Maven Central/
    // CocoaPods públicos) — ao contrário do plugin `@rnmapbox/maps` que
    // este app usava antes, nenhum token de download é necessário aqui.
    "@maplibre/maplibre-react-native",
    [
      "expo-location",
      {
        // Textos de justificativa de uso de localizacao exigidos pela
        // App Store Review (Dossie 9, Secao 6.3) — o plugin injeta as
        // chaves de Info.plist automaticamente (nunca mais declaradas
        // manualmente em `ios.infoPlist`, para evitar duas fontes de
        // verdade). "When in use": Responsavel buscando transportadores
        // proximos (briefing "Marketplace" §"MAPA"). "Always": Motorista
        // com viagem ativa (Dossie 9, Secao 6.3), unico uso de segundo
        // plano hoje.
        locationWhenInUsePermission:
          "A Rotta usa sua localização para encontrar transportadores escolares próximos de você.",
        locationAlwaysAndWhenInUsePermission:
          "A Rotta usa sua localização durante a viagem ativa para que as famílias acompanhem o trajeto em tempo real.",
        isIosBackgroundLocationEnabled: true,
        isAndroidBackgroundLocationEnabled: true,
      },
    ],
  ],
});

import type { ExpoConfig } from "expo/config";

/**
 * Configuracao dinamica do Expo — gera dois produtos de loja distintos
 * ("Rotta Motorista" e "Rotta Familia") a partir do MESMO codigo-fonte
 * (Dossie 9, Secao 4.2.1), diferenciados apenas por variante de build
 * (EAS Build profiles), nunca por duplicacao de projeto.
 *
 * Nenhum icone/splash real foi adicionado ainda (fase de fundacao) —
 * `icon`/`splash` serao configurados junto com a identidade visual real
 * do Dossie 10.
 */
type AppVariant = "driver" | "parent";

const variant = (process.env.EXPO_PUBLIC_APP_VARIANT as AppVariant | undefined) ?? "driver";

const variantConfig: Record<AppVariant, Pick<ExpoConfig, "name" | "slug" | "scheme">> = {
  driver: {
    name: "Rotta Motorista",
    slug: "rotta-motorista",
    scheme: "rotta-motorista",
  },
  parent: {
    name: "Rotta Família",
    slug: "rotta-familia",
    scheme: "rotta-familia",
  },
};

export default (): ExpoConfig => ({
  ...variantConfig[variant],
  owner: "rotta",
  version: "0.1.0",
  orientation: "portrait",
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  platforms: ["ios", "android"],
  ios: {
    supportsTablet: false,
    bundleIdentifier: variant === "driver" ? "br.com.rotta.motorista" : "br.com.rotta.familia",
    infoPlist: {
      // Justificativa de uso de localizacao em segundo plano — exigida
      // pela App Store Review (Dossie 9, Secao 6.3). Texto final a
      // revisar junto com o time de produto antes do primeiro envio.
      NSLocationAlwaysAndWhenInUseUsageDescription:
        "A Rotta usa sua localização durante a viagem ativa para que as famílias acompanhem o trajeto em tempo real.",
    },
  },
  android: {
    package: variant === "driver" ? "br.com.rotta.motorista" : "br.com.rotta.familia",
    permissions: ["ACCESS_FINE_LOCATION", "ACCESS_BACKGROUND_LOCATION"],
  },
  extra: {
    appVariant: variant,
  },
  plugins: ["expo-secure-store"],
});

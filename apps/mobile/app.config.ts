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
 * Ícone/splash reais (`assets/icon.png`, `assets/adaptive-icon.png`,
 * `assets/splash-icon.png`) gerados a partir do logotipo enviado pelo
 * usuário (`apps/web/public/brand/rotta-mark.png`, mesma fonte usada
 * no favicon/manifest do Web e no ícone do Admin) — nunca redesenhados
 * à parte, para os três apps nunca divergirem de marca.
 */
export default (): ExpoConfig => ({
  name: "Rotta",
  slug: "rotta",
  scheme: "rotta",
  owner: "rotta",
  // Auditoria minuciosa 04/09/2026 — bump pra 1.0.0 (primeiro envio
  // público real à Play Store). `versionCode` (Android) é numérico e
  // gerenciado à parte pelo EAS (`eas.json` -> `appVersionSource:
  // "remote"` + `autoIncrement: true` no perfil de produção) — este
  // campo é só o "versionName" exibido ao usuário.
  version: "1.0.0",
  orientation: "portrait",
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  platforms: ["ios", "android"],
  icon: "./assets/icon.png",
  splash: {
    image: "./assets/splash-icon.png",
    backgroundColor: "#0B0F14",
    resizeMode: "contain",
  },
  ios: {
    supportsTablet: false,
    bundleIdentifier: "br.com.rotta.app",
  },
  android: {
    package: "br.com.rotta.app",
    permissions: ["ACCESS_FINE_LOCATION", "ACCESS_BACKGROUND_LOCATION"],
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#0B0F14",
    },
  },
  web: {
    favicon: "./assets/favicon.png",
  },
  // `extra.eas.projectId` — só existe depois de rodar `eas init` uma vez
  // (grátis, só exige login na conta Expo do projeto; nenhum cartão ou
  // console pago). Sem ele, `usePushRegistration` (mobile) detecta a
  // ausência e não tenta registrar nenhum token — mesmo "stub honesto"
  // usado em `FcmService`/`WebPushService` (Frente 0 do push real).
  extra: {
    eas: {
      projectId: process.env.EAS_PROJECT_ID || undefined,
    },
  },
  plugins: [
    "expo-secure-store",
    [
      "expo-notifications",
      {
        // Ícone/cor da notificação Android — mesmo token `success` (verde)
        // do Design System (`packages/theme/src/tokens/colors.ts`), tema
        // claro; nenhum som customizado, usa o padrão do sistema.
        icon: "./assets/adaptive-icon.png",
        color: "#16A34A",
      },
    ],
    // MapLibre Native é inteiramente open-source (Maven Central/
    // CocoaPods públicos) — ao contrário do plugin `@rnmapbox/maps` que
    // este app usava antes, nenhum token de download é necessário aqui.
    "@maplibre/maplibre-react-native",
    [
      // "Acesso rápido" (pedido do usuário 05/09/2026: "pode colocar
      // digital?") — Face ID/Touch ID no iOS, impressão digital/rosto no
      // Android, mesma API dos dois lados (`expo-local-authentication`).
      // A frase abaixo só é exigida pela App Store Review (Info.plist);
      // no Android o sistema não pede nenhuma permissão de tempo de
      // execução pra isto. Opt-in explícito no Perfil — nunca ativado
      // sozinho, e nunca substitui a sessão real (`@rotta/auth`), só
      // desbloqueia a UI de uma sessão que já existe (mesmo papel do PIN).
      "expo-local-authentication",
      {
        faceIDPermission: "A Rotta usa Face ID para desbloquear o app rapidamente.",
      },
    ],
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

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
  // Slug real do projeto na conta EAS (criado como "rottabr", não
  // "rotta" — "rotta" sozinho já não estava disponível/era outro
  // projeto). Não afeta o nome exibido do app (`name` acima) nem o
  // pacote Android/iOS (`android.package`/`ios.bundleIdentifier`
  // abaixo), só o identificador do projeto na Expo.
  slug: "rottabr",
  scheme: "rotta",
  // Conta EAS real do projeto (09/09/2026) — a organização Expo se
  // chama "rotta-do-brasil-mobilidade-escolar", não "rotta" (esse nome
  // já existia como outra conta/slug na Expo, sem relação com este
  // projeto).
  owner: "rotta-do-brasil-mobilidade-escolar",
  // Auditoria minuciosa 04/09/2026 — bump pra 1.0.0 (primeiro envio
  // público real à Play Store). `versionCode` (Android) é numérico e
  // gerenciado à parte pelo EAS (`eas.json` -> `appVersionSource:
  // "remote"` + `autoIncrement: true` no perfil de produção) — este
  // campo é só o "versionName" exibido ao usuário.
  version: "1.1.0",
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
    bundleIdentifier: "br.com.rottabr",
  },
  android: {
    // Codigo de versao fixo e explicito (15/09/2026) — corrige erro do
    // Play Console "Este APK nao sera disponibilizado a nenhum usuario,
    // pois esta completamente sobreposto por um ou mais APKs com codigos
    // de versao superiores". Causa real: `eas.json` usava
    // `appVersionSource: "remote"` (contador guardado nos servidores da
    // EAS, incrementado a cada build), mas esse contador comecou do zero
    // quando essa estrategia foi adotada — ficou desalinhado com o
    // historico real do app no Play Console, que ja tinha pacotes com
    // codigo de versao maior (de antes desse fluxo automatizado existir).
    // Builds #15/#16 saiam com codigo baixo (~15/16) e o Play Console os
    // rejeitava por ja existir algo maior la.
    //
    // Correcao: parar de depender do contador remoto (`appVersionSource`
    // agora "local" em `eas.json`) e fixar aqui um numero alto o
    // suficiente pra nunca colidir com nenhum pacote ja enviado
    // manualmente antes (bem abaixo do limite de 2100000000 do Android).
    // Sem `autoIncrement` (nao persiste entre builds nesta CI efemera —
    // cada checkout comeca do zero), esse numero precisa ser subido a mao
    // a cada novo build de producao.
    versionCode: 100002,
    // Corrigido de "br.com.rotta.app" (10/09/2026) — o upload do .aab pra
    // Play Console recusou com dois avisos: (1) "precisa ter o nome de
    // pacote br.com.rottabr" — o app ja tinha sido criado no Console com
    // ESTE nome de pacote (a ficha do app la fixa o nome de pacote pra
    // sempre desde a criacao, nunca muda depois); (2) as authorities dos
    // content providers automaticos do Android
    // (FileSystemFileProvider/androidx-startup/fileprovider, derivadas do
    // applicationId) ja estavam em uso por OUTRO desenvolvedor com
    // "br.com.rotta.app" — nome de pacote colidindo globalmente na Play
    // Store, nao so uma preferencia nossa. Nenhum outro lugar do codigo
    // dependia do nome antigo. (Desde 15/09/2026 existe SIM um
    // `google-services.json` acoplado a este nome de pacote — ver
    // `googleServicesFile` logo abaixo; trocar o pacote de novo exigiria
    // registrar o novo nome no Firebase tambem.)
    package: "br.com.rottabr",
    // Credencial do Firebase Cloud Messaging (15/09/2026) — o que
    // FALTAVA pra notificação chegar na bandeja do celular.
    //
    // O push da Rotta é enviado pelo serviço do Expo
    // (`ExpoPushService`, backend), mas no Android o Expo apenas
    // repassa pro FCM: sem esta credencial no build, o
    // `getExpoPushTokenAsync` do app nem gera token, e o aviso morre no
    // caminho sem erro nenhum (o pior tipo de falha — silenciosa). Com
    // ela, "veículo próximo", "aluno embarcou", ocorrência e emergência
    // aparecem com o app fechado.
    //
    // O arquivo NÃO é segredo: ele vai embutido dentro de todo APK
    // publicado, e só identifica o app (`project_id`,
    // `mobilesdk_app_id`, chave de API restrita ao pacote
    // `br.com.rottabr`). O que é segredo de verdade é a CHAVE PRIVADA
    // da conta de serviço, usada pra ENVIAR push — essa vive só nas
    // credenciais do EAS (`eas credentials`), nunca neste repositório.
    googleServicesFile: process.env.GOOGLE_SERVICES_JSON || "./google-services.json",
    permissions: ["ACCESS_FINE_LOCATION", "ACCESS_BACKGROUND_LOCATION"],
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#0B0F14",
    },
  },
  web: {
    favicon: "./assets/favicon.png",
  },
  // `extra.eas.projectId` — vinculado via `eas init --id ...` (09/09/2026),
  // projeto real na conta EAS "rotta". Sem ele, `usePushRegistration`
  // (mobile) detecta a ausência e não tenta registrar nenhum token —
  // mesmo "stub honesto" usado em `FcmService`/`WebPushService` (Frente 0
  // do push real). Não é segredo (é só um identificador de projeto,
  // público em qualquer build do app) — por isso fixo aqui, com
  // `EAS_PROJECT_ID` como override só pra quem quiser apontar pra outro
  // projeto EAS em dev.
  extra: {
    eas: {
      projectId: process.env.EAS_PROJECT_ID || "40595609-e641-48aa-a8d2-f5c55e19050f",
    },
  },
  plugins: [
    [
      "expo-build-properties",
      {
        // Fix do build de producao/preview (EAS, 10/09/2026): o Compose
        // Compiler 1.5.15 que o `expo-modules-core` do SDK 52 traz exige
        // Kotlin >=1.9.25, mas o AGP/Expo Gradle plugin ainda fixa Kotlin
        // 1.9.24 por padrao — `expo-modules-core:compileReleaseKotlin`
        // falhava com "Compilation error" nos dois builds (ver log da
        // fase RUN_GRADLEW). Kotlin 1.9.25 e 100% compativel com 1.9.24
        // (patch release), sem mudanca de comportamento esperada.
        //
        // targetSdkVersion/compileSdkVersion (11/09/2026): erro real
        // bloqueante da Google Play Console no primeiro upload aceito —
        // "atualmente tem como alvo o nivel de API 34 e precisa ter como
        // alvo pelo menos o nivel de API 36". O padrao do Expo SDK 52/
        // `@react-native/gradle-plugin` 0.76 ainda e compileSdk 35/
        // targetSdk 34. AGP 8.6 (versao fixada pelo mesmo gradle-plugin)
        // compila normalmente contra compileSdk 36 — so emite aviso de
        // "versao nao testada oficialmente", nao erro — entao nao foi
        // necessario trocar de versao do Expo SDK/React Native pra isto.
        android: {
          kotlinVersion: "1.9.25",
          compileSdkVersion: 36,
          targetSdkVersion: 36,
          buildToolsVersion: "36.0.0",
        },
      },
    ],
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
    [
      // Frente 3b (Empresa/Gestor reduzida no app) — upload de foto de
      // documento de veículo (CRLV/seguro/etc.), primeiro uso de
      // seleção de arquivo em todo o app mobile. Textos de
      // justificativa exigidos pela App Store Review, mesmo padrão de
      // `expo-location`/`expo-local-authentication` acima.
      "expo-image-picker",
      {
        photosPermission: "A Rotta usa suas fotos para anexar documentos dos seus veículos.",
        cameraPermission: "A Rotta usa a câmera para fotografar documentos dos seus veículos.",
      },
    ],
  ],
});

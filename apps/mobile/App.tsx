import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AppErrorBoundary } from "@/components/app-error-boundary";
import { isEnvConfigValid } from "@/config/env";
import { RootNavigator } from "@/navigation/RootNavigator";
import { AppProviders } from "@/providers/app-providers";
import { ThemeProvider } from "@/providers/theme-provider";
import { AppConfigErrorScreen } from "@/screens/app-config-error-screen";

/**
 * Ponto de entrada do app mobile (Dossie 22, Secao 4.2).
 *
 * `AppErrorBoundary` (auditoria minuciosa 03/09/2026) envolve TUDO —
 * inclusive `AppProviders` — de propósito: é a rede de segurança contra
 * um erro de render não tratado em qualquer lugar da árvore, então não
 * pode ficar por baixo de nada que possa ter sido a própria causa do
 * erro (ver a nota completa no componente).
 *
 * `isEnvConfigValid` (achado 15/09/2026, ver `src/config/env.ts`) —
 * quando a configuração de build não veio completa, o app nem tenta
 * montar `AppProviders`/`RootNavigator` (que dependem de
 * `EXPO_PUBLIC_API_URL`/`EXPO_PUBLIC_WEB_URL` pra login e pras telas de
 * WebView): mostra direto `AppConfigErrorScreen`, com só o mínimo de
 * provider que ela precisa (`SafeAreaProvider`/`ThemeProvider`, nenhum
 * dos dois chama a API) — nunca deixa cada tela falhar sozinha com uma
 * mensagem genérica e confusa própria.
 */
export default function App(): JSX.Element {
  return (
    <AppErrorBoundary>
      {isEnvConfigValid ? (
        <AppProviders>
          <StatusBar style="light" />
          <RootNavigator />
        </AppProviders>
      ) : (
        <SafeAreaProvider>
          <ThemeProvider>
            <StatusBar style="light" />
            <AppConfigErrorScreen />
          </ThemeProvider>
        </SafeAreaProvider>
      )}
    </AppErrorBoundary>
  );
}

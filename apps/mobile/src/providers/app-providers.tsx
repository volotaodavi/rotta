import { AuthProvider } from "@rotta/auth/native";
import { configureRottaMaps } from "@rotta/maps/native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { QueryProvider } from "./query-provider";
import { ThemeProvider } from "./theme-provider";

import type { ReactNode } from "react";

import { env } from "@/config/env";
import { authApi } from "@/lib/api-client";

/**
 * Rotta Geo Platform — mesmo raciocínio de `apps/web/.../app-providers.tsx`:
 * chamado no corpo do módulo (executa uma única vez, no primeiro
 * `import` deste arquivo, sempre antes de qualquer `<RottaMap/>`
 * montar), nunca dentro de um `useEffect`.
 */
configureRottaMaps({
  mapTilerApiKey: env.EXPO_PUBLIC_MAPTILER_API_KEY,
  cartoApiKey: env.EXPO_PUBLIC_CARTO_API_KEY,
});

/**
 * Composicao unica de todos os providers de nivel de aplicacao do app
 * mobile (Dossie 23, Secao 1.1). `AuthProvider` (Dossie 15) mantem a
 * mesma sessao/conta compartilhada com `apps/web`/`apps/admin`.
 */
export function AppProviders({ children }: { children: ReactNode }): JSX.Element {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <QueryProvider>
          <AuthProvider authApi={authApi}>{children}</AuthProvider>
        </QueryProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

import { AuthProvider } from "@rotta/auth/native";
import { SafeAreaProvider } from "react-native-safe-area-context";


import { QueryProvider } from "./query-provider";
import { ThemeProvider } from "./theme-provider";

import type { ReactNode } from "react";

import { authApi } from "@/lib/api-client";

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

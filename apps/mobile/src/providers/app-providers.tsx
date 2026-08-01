import { SafeAreaProvider } from "react-native-safe-area-context";

import { QueryProvider } from "./query-provider";
import { ThemeProvider } from "./theme-provider";

import type { ReactNode } from "react";

/**
 * Composicao unica de todos os providers de nivel de aplicacao do app
 * mobile (Dossie 23, Secao 1.1). O provider de sessao de autenticacao
 * (`@rotta/auth`) entra aqui quando a funcionalidade real for
 * implementada (Dossie 15).
 */
export function AppProviders({ children }: { children: ReactNode }): JSX.Element {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <QueryProvider>{children}</QueryProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

import { QueryProvider } from "./query-provider";
import { ThemeProvider } from "./theme-provider";

import type { ReactNode } from "react";

/**
 * Composicao unica de todos os providers de nivel de aplicacao (Dossie 23,
 * Secao 1.1 — `providers/`). Novos providers (ex. sessao de autenticacao,
 * quando `@rotta/auth` ganhar implementacao real) entram aqui, nunca
 * espalhados ad-hoc pelas paginas.
 */
export function AppProviders({ children }: { children: ReactNode }): JSX.Element {
  return (
    <ThemeProvider>
      <QueryProvider>{children}</QueryProvider>
    </ThemeProvider>
  );
}

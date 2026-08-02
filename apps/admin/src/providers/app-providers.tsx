"use client";

import { AuthProvider } from "@rotta/auth/web";


import { QueryProvider } from "./query-provider";
import { ThemeProvider } from "./theme-provider";

import type { ReactNode } from "react";

import { authApi } from "@/lib/api-client";

/**
 * Composicao unica de todos os providers de nivel de aplicacao (Dossie 23,
 * Secao 1.1 — `providers/`). `AuthProvider` (Dossiê 15) precisa envolver
 * `QueryProvider` (não o contrário) — os hooks de dados de negócio
 * (`useCompaniesList` etc.) dependem do token que ele mantém em memória.
 */
export function AppProviders({ children }: { children: ReactNode }): JSX.Element {
  return (
    <ThemeProvider>
      <AuthProvider authApi={authApi}>
        <QueryProvider>{children}</QueryProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

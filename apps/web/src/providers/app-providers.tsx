"use client";

import { AuthProvider } from "@rotta/auth/web";
import { ToastProvider } from "@rotta/ui/web";
import { useEffect } from "react";

import { QueryProvider } from "./query-provider";
import { ThemeProvider } from "./theme-provider";

import type { ReactNode } from "react";

import { authApi } from "@/lib/api-client";
import { initGlobalErrorCapture } from "@/lib/global-error-capture";

/**
 * Composicao unica de todos os providers de nivel de aplicacao (Dossie 23,
 * Secao 1.1 — `providers/`). `AuthProvider` (Dossiê 15) precisa envolver
 * `QueryProvider` (não o contrário) — os hooks de dados de negócio
 * (`useMyCompany` etc.) dependem do token que ele mantém em memória.
 *
 * `ToastProvider` (por fora de tudo, mesma composição de
 * `apps/admin/src/providers/app-providers.tsx`) — achado desta
 * entrega: o componente já existia em `@rotta/ui` (Frente "não está
 * havendo ações nos botões"), mas só tinha sido ligado no Admin;
 * `apps/web` nunca teve `useToast()` disponível em lugar nenhum.
 */
export function AppProviders({ children }: { children: ReactNode }): JSX.Element {
  // Ver `@/lib/global-error-capture.ts` — captura, sem redação, qualquer
  // erro assíncrono (Promise rejeitada sem `.catch()`, `window.onerror`)
  // que NUNCA passaria por um Error Boundary do React, pra `error.tsx`
  // poder mostrar o diagnóstico bruto na própria tela.
  useEffect(() => {
    initGlobalErrorCapture();
  }, []);

  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider authApi={authApi}>
          <QueryProvider>{children}</QueryProvider>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

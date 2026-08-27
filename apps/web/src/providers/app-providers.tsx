"use client";

import { AuthProvider } from "@rotta/auth/web";
import { configureRottaMaps } from "@rotta/maps/web";
import { ToastProvider, TrialLockModal } from "@rotta/ui/web";
import { useEffect } from "react";

import { QueryProvider } from "./query-provider";
import { ThemeProvider } from "./theme-provider";

import type { ReactNode } from "react";

import { env } from "@/config/env";
import { authApi } from "@/lib/api-client";
import { initGlobalErrorCapture } from "@/lib/global-error-capture";



/**
 * Chamado no CORPO de render (nunca dentro de um `useEffect`) — ver a
 * nota completa em `configureRottaMaps` (`@rotta/maps/web`): efeitos de
 * componentes filhos (como o `<RottaMap/>` que a Landing Page já monta
 * na primeira tela) disparam ANTES do efeito deste provider raiz, então
 * configurar aqui de dentro de um efeito arriscaria o primeiro mapa
 * montar antes da chave estar disponível.
 */
configureRottaMaps({ mapTilerApiKey: env.NEXT_PUBLIC_MAPTILER_API_KEY });

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
 *
 * `<TrialLockModal/>` (Dossiê 26, faturamento) montado uma única vez
 * aqui — mesmo espírito do Toast: `openTrialLockModalFromOutsideReact`
 * (chamado tanto pelo `MutationCache.onError` de `query-provider.tsx`
 * quanto pelo cadeado da navegação em `(dashboard)/layout.tsx`) só
 * encontra um listener ativo se este componente estiver montado.
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
        <TrialLockModal />
        <AuthProvider authApi={authApi}>
          <QueryProvider>{children}</QueryProvider>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

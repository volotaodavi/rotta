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
 * (`useCompaniesList` etc.) dependem do token que ele mantém em memória.
 *
 * `ToastProvider` (por fora de tudo) — pedido do usuário: "não está
 * havendo ações nos botões". Nenhuma mutação do Admin tinha feedback
 * visível de erro (`QueryProvider.mutations.retry: false`, e nenhuma
 * tela renderizava `isError`) — o botão simplesmente parava de carregar
 * e nada mudava na tela, indistinguível de "não fez nada". Hoje é
 * automático: `QueryProvider` registra um `MutationCache.onError` global
 * que mostra o toast sozinho pra qualquer mutação que falhar — uma
 * mutação específica ainda pode chamar `toast.error(...)` no próprio
 * `onError` quando quiser uma mensagem sob medida (ver
 * `verificacao-identidade/[userId]/page.tsx`), os dois convivem.
 */
export function AppProviders({ children }: { children: ReactNode }): JSX.Element {
  // Ver `@/lib/global-error-capture.ts` — captura, sem redação, qualquer
  // erro assíncrono que nunca passaria por um Error Boundary do React,
  // pra `error.tsx` poder mostrar o diagnóstico bruto na própria tela.
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

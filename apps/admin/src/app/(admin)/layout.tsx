"use client";

import { useAuth } from "@rotta/auth/web";
import { Button, Spinner, Typography } from "@rotta/ui/web";
import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

/**
 * Layout do painel administrativo interno (Dossie 11, Secao 6) —
 * clientes/tenants, suporte, financeiro, logs, metricas.
 *
 * Exige sessão ativa E papel `admin_rotta` (Dossiê 12 §4.5 — perfil de
 * acesso cross-tenant, nunca compartilhado com nenhum outro papel,
 * mesmo princípio estrutural do `(dashboard)/layout.tsx` de apps/web).
 */
export default function AdminLayout({ children }: { children: ReactNode }): JSX.Element {
  const { status, user, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/entrar");
    } else if (status === "authenticated" && user?.role !== "admin_rotta") {
      router.replace("/entrar");
    }
  }, [status, user, router]);

  if (status !== "authenticated" || user?.role !== "admin_rotta") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-text">
      <header className="flex items-center justify-between border-b border-border px-6 py-4">
        <Typography variant="subtitle">Rotta Admin</Typography>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            void logout().then(() => router.replace("/entrar"));
          }}
        >
          Sair
        </Button>
      </header>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}

"use client";

import { useAuth } from "@rotta/auth/web";
import { Button, Spinner, Typography } from "@rotta/ui/web";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

/**
 * Layout do route group `(dashboard)` — Painel Administrativo autenticado
 * (Empresa, Gestor, Escola — Dossie 11, Secao 2/5), com o AppShell
 * (sidebar + cabecalho, Dossie 10 Secao 11.2).
 *
 * Toda rota sob este grupo exige sessão ativa (Dossiê 15) — nenhuma tela
 * individual reimplementa a checagem de autenticação, ela é garantida
 * estruturalmente por estar dentro deste layout (Dossiê 23, Secao 4.1).
 */
export default function DashboardLayout({ children }: { children: ReactNode }): JSX.Element {
  const { status, user, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/entrar");
    }
  }, [status, router]);

  if (status !== "authenticated") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-text">
      <header className="flex items-center justify-between border-b border-border px-6 py-4">
        <div className="flex items-center gap-8">
          <Typography variant="subtitle">{user?.companyName ?? "Rotta"}</Typography>
          <nav className="flex items-center gap-4">
            <Link
              href="/empresa"
              className="text-sm text-text-muted transition-colors hover:text-text"
            >
              Minha Empresa
            </Link>
            <Link
              href="/veiculos"
              className="text-sm text-text-muted transition-colors hover:text-text"
            >
              Veículos
            </Link>
          </nav>
        </div>
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
      {/* Sidebar real (Dossie 10, Secao 11.2) entra aqui quando @rotta/ui tiver o componente */}
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}

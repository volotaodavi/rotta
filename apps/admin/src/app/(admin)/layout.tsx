"use client";

import { useAuth } from "@rotta/auth/web";
import { Button, Spinner, Typography } from "@rotta/ui/web";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { ThemeToggle } from "@/components/theme-toggle";

const NAV_LINKS = [
  { href: "/", label: "Painel" },
  { href: "/empresas", label: "Empresas" },
  { href: "/escolas", label: "Escolas" },
  { href: "/veiculos", label: "Veículos" },
  { href: "/marketplace/solicitacoes", label: "Marketplace" },
  { href: "/aprovacoes", label: "Aprovações" },
  { href: "/suporte", label: "Suporte" },
  { href: "/inteligencia", label: "Inteligência" },
  { href: "/saude", label: "Saúde" },
  { href: "/documentos-legais", label: "Documentos Legais" },
  { href: "/auditoria-legal", label: "Auditoria Legal" },
] as const;

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
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            <Image src="/brand/rotta-mark-512.png" alt="Rotta" width={28} height={28} priority />
            <Typography variant="subtitle">Rotta Admin</Typography>
          </div>
          <nav className="flex items-center gap-4">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm text-text-muted transition-colors hover:text-text"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              void logout().then(() => router.replace("/entrar"));
            }}
          >
            Sair
          </Button>
        </div>
      </header>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}

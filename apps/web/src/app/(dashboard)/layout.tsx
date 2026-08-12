"use client";

import { useAuth } from "@rotta/auth/web";
import { Button, Spinner, Typography } from "@rotta/ui/web";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import type { Route } from "next";

import { LegalFooter } from "@/components/legal/legal-footer";
import { ThemeToggle } from "@/components/theme-toggle";

/** Um item de navegação do cabeçalho — `href`/`label`, nada além disso. */
interface NavLink {
  href: Route;
  label: string;
}

/**
 * Navegação da Área Profissional (Empresa/Gestor/Escola/Motorista/
 * Monitor) — a mesma lista que já existia antes desta entrega ser
 * role-aware.
 */
const PROFISSIONAL_NAV: NavLink[] = [
  { href: "/empresa", label: "Minha Empresa" },
  { href: "/veiculos", label: "Veículos" },
  { href: "/escolas", label: "Escolas" },
  { href: "/marketplace/solicitacoes", label: "Marketplace" },
  { href: "/rotta-pay", label: "Rotta Pay" },
  { href: "/verificacao-identidade", label: "Verificar identidade" },
  { href: "/notificacoes", label: "Notificações" },
  { href: "/chamados", label: "Chamados" },
];

/**
 * Navegação da Área Pessoal (Responsável) — gap fechado nesta entrega:
 * até aqui o Painel Web só tinha a navegação Profissional acima, então
 * um Responsável autenticado via web caía neste mesmo layout sem nada
 * que fizesse sentido pra ele (nenhum item aplicável). "Meus Alunos" é
 * a home real dele — cadastro + acompanhamento de GPS ao vivo
 * (`/alunos`, Dossiê 45 — gap C: nenhuma UI em nenhuma plataforma
 * chamava `studentsApi.create` antes desta entrega).
 */
const RESPONSAVEL_NAV: NavLink[] = [
  { href: "/alunos", label: "Meus Alunos" },
  { href: "/notificacoes", label: "Notificações" },
  { href: "/chamados", label: "Chamados" },
];

/**
 * Layout do route group `(dashboard)` — Painel Administrativo autenticado
 * (Empresa, Gestor, Escola, Responsável — Dossie 11, Secao 2/5), com o
 * AppShell (sidebar + cabecalho, Dossie 10 Secao 11.2).
 *
 * Toda rota sob este grupo exige sessão ativa (Dossiê 15) — nenhuma tela
 * individual reimplementa a checagem de autenticação, ela é garantida
 * estruturalmente por estar dentro deste layout (Dossiê 23, Secao 4.1).
 * A navegação exibida no cabeçalho passou a depender de `user.role`
 * (`RESPONSAVEL_NAV` vs `PROFISSIONAL_NAV`) — cada rota individual
 * dentro do grupo já é protegida pelo próprio backend (RBAC/tenant), o
 * papel deste `if` é só cosmético (não mostrar item que não serve pro
 * papel logado), nunca a única barreira de acesso.
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

  const isResponsavel = user?.role === "responsavel";
  const navLinks = isResponsavel ? RESPONSAVEL_NAV : PROFISSIONAL_NAV;

  return (
    <div className="flex min-h-screen flex-col bg-background text-text">
      <header className="flex items-center justify-between border-b border-border px-6 py-4">
        <div className="flex items-center gap-8">
          <Typography variant="subtitle">
            {isResponsavel ? (user?.nome ?? "Rotta") : (user?.companyName ?? "Rotta")}
          </Typography>
          <nav className="flex items-center gap-4">
            {navLinks.map((link) => (
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
      {/* Sidebar real (Dossie 10, Secao 11.2) entra aqui quando @rotta/ui tiver o componente */}
      <main className="flex-1 p-6">{children}</main>
      <LegalFooter />
    </div>
  );
}

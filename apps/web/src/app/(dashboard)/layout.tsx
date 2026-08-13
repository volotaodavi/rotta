"use client";

import { useAuth } from "@rotta/auth/web";
import { Button, Spinner, Typography } from "@rotta/ui/web";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import type { Route } from "next";

import { LegalFooter } from "@/components/legal/legal-footer";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAppMode } from "@/features/driver/hooks/use-app-mode";
import { useMyActiveTrip } from "@/features/driver/hooks/use-my-active-trip";
import { IdentityVerificationBlockScreen } from "@/features/identity-verification/components/identity-verification-block-screen";
import { useMyIdentityVerification } from "@/features/identity-verification/hooks/use-identity-verification";

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
  { href: "/equipe", label: "Equipe" },
  { href: "/veiculos", label: "Veículos" },
  { href: "/escolas", label: "Escolas" },
  { href: "/marketplace/solicitacoes", label: "Marketplace" },
  { href: "/rotta-pay", label: "Rotta Pay" },
  { href: "/verificacao-identidade", label: "Verificar identidade" },
  { href: "/notificacoes", label: "Notificações" },
  { href: "/chamados", label: "Chamados" },
];

const MINHA_ROTA_LINK: NavLink = { href: "/minha-rota", label: "Minha Rota" };

/**
 * Modo Ação (Frente G, pedido do usuário em produção) — só existe para
 * Motorista/Monitor autônomo/MEI (`useAppMode`: `role === "empresa"` +
 * `companyType` `AUTONOMO`/`MEI`, ou seja o dono que também dirige).
 * Reduz o menu ao essencial do dia a dia rodando a rota — o resto
 * (Empresa, Equipe, Veículos, Escolas, Marketplace, Verificação de
 * identidade) continua a um clique de distância em "Visão completa",
 * nunca removido de verdade, só fora do caminho enquanto dirige.
 */
const ACTION_NAV: NavLink[] = [
  MINHA_ROTA_LINK,
  { href: "/rotta-pay", label: "Rotta Pay" },
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

  const isResponsavel = user?.role === "responsavel";
  const { mode, canToggle, setMode } = useAppMode(user);

  // Responsável não usa este fluxo (`SELF_VERIFICATION_ROLES` no
  // backend não inclui `responsavel`) — a query nem dispara pra ele,
  // pra nunca gerar um 403 à toa nem atrasar a home dele.
  const shouldCheckIdentity = status === "authenticated" && !isResponsavel;
  const { data: identityVerification, isLoading: isIdentityLoading } = useMyIdentityVerification({
    enabled: shouldCheckIdentity,
  });
  const isBlockedByIdentityVerification = identityVerification?.status === "REPROVADA";

  // "Em viagem agora" (Frente G, "inove"): só busca quando faz sentido — elegível
  // ao alternador, navegando em "Visão completa" (em "Modo Ação" já está na
  // própria "Minha Rota", o aviso seria redundante) e sem nada bloqueando a tela.
  // Chamado incondicionalmente (Regra dos Hooks) — quem controla o custo de
  // rede é o `enabled` interno do hook, nunca pular a chamada em si.
  const activeTrip = useMyActiveTrip(
    canToggle && mode !== "acao" && !isBlockedByIdentityVerification,
  );

  if (status !== "authenticated" || (shouldCheckIdentity && isIdentityLoading)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Spinner size="lg" />
      </div>
    );
  }

  const navLinks = isResponsavel
    ? RESPONSAVEL_NAV
    : canToggle && mode === "acao"
      ? ACTION_NAV
      : canToggle
        ? [MINHA_ROTA_LINK, ...PROFISSIONAL_NAV]
        : PROFISSIONAL_NAV;

  return (
    <div className="flex min-h-screen flex-col bg-background text-text">
      <header className="flex items-center justify-between border-b border-border px-6 py-4">
        <div className="flex items-center gap-8">
          <Typography variant="subtitle">
            {isResponsavel ? (user?.nome ?? "Rotta") : (user?.companyName ?? "Rotta")}
          </Typography>
          {!isBlockedByIdentityVerification && (
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
          )}
        </div>
        <div className="flex items-center gap-2">
          {canToggle && !isBlockedByIdentityVerification && (
            <div
              role="tablist"
              aria-label="Alternar entre visão completa e modo ação"
              className="flex items-center rounded-full border border-border bg-surface p-0.5 text-xs font-semibold"
            >
              <button
                type="button"
                role="tab"
                aria-selected={mode === "completo"}
                onClick={() => setMode("completo")}
                className={`rounded-full px-3 py-1 transition-colors ${
                  mode === "completo" ? "bg-primary text-white" : "text-text-muted hover:text-text"
                }`}
              >
                Visão completa
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === "acao"}
                onClick={() => setMode("acao")}
                className={`rounded-full px-3 py-1 transition-colors ${
                  mode === "acao" ? "bg-primary text-white" : "text-text-muted hover:text-text"
                }`}
              >
                Modo Ação
              </button>
            </div>
          )}
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
      {activeTrip && !isBlockedByIdentityVerification && (
        <Link
          href="/minha-rota"
          className="flex items-center justify-center gap-2 bg-primary px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          {activeTrip.status === "EM_ANDAMENTO" ? "🚐 Em viagem agora" : "⏸️ Viagem pausada"} —{" "}
          {activeTrip.routeNome} · Ir para Minha Rota
        </Link>
      )}
      {isBlockedByIdentityVerification ? (
        <IdentityVerificationBlockScreen motivo={identityVerification?.motivo ?? null} />
      ) : (
        <>
          {/* Sidebar real (Dossie 10, Secao 11.2) entra aqui quando @rotta/ui tiver o componente */}
          <main className="flex-1 p-6">{children}</main>
          <LegalFooter />
        </>
      )}
    </div>
  );
}

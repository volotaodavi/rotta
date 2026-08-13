"use client";

import { useAuth } from "@rotta/auth/web";
import { Button, Spinner, Typography } from "@rotta/ui/web";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import type { Route } from "next";

import { DriverBottomNav } from "@/components/driver-bottom-nav";
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
 * Navegação da Área Profissional de gestão (Empresa/Gestor/Escola) —
 * Motorista/Monitor FUNCIONÁRIO nunca vê esta lista (Frente H, ver
 * `EMPLOYEE_DRIVER_NAV` logo abaixo) nem o dono autônomo/MEI em "Modo
 * Ação" (`ACTION_NAV`).
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
// "Atividades" (Frente K) — histórico de viagens, mesma página pro
// dono autônomo/MEI e pro funcionário Motorista/Monitor (mesmo
// raciocínio de `MINHA_ROTA_LINK`: uma página, dois públicos).
const ATIVIDADES_LINK: NavLink = { href: "/atividades", label: "Atividades" };

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
  ATIVIDADES_LINK,
  { href: "/rotta-pay", label: "Rotta Pay" },
  { href: "/notificacoes", label: "Notificações" },
  { href: "/chamados", label: "Chamados" },
];

/**
 * Motorista/Monitor FUNCIONÁRIO de uma empresa (Frente H, pedido do
 * usuário em produção — "readequação... eles só possuem uma função,
 * não precisa acumular todas"). `role` é `"motorista"`/`"monitor"`
 * (nunca `"empresa"` — esse é o dono autônomo/MEI, tratado por
 * `ACTION_NAV` acima), então nunca gerencia Empresa/Equipe/Veículos/
 * Escolas/Marketplace — só roda a rota. "Minha Rota" é a MESMA página
 * usada pelo dono autônomo (`RoutesService.list`/`TripsService` já
 * escopam por `motoristaPadraoId`/`monitorPadraoId` no backend
 * independente de quem é dono da empresa) — nenhuma tela nova
 * precisou ser criada, só apontada pra quem tinha sido esquecido.
 * Sem "Rotta Pay" aqui: hoje é só um placeholder "Em breve"
 * (`(dashboard)/rotta-pay/page.tsx`) pra qualquer papel — nada a
 * mostrar ainda pro funcionário também.
 */
const EMPLOYEE_DRIVER_NAV: NavLink[] = [
  MINHA_ROTA_LINK,
  ATIVIDADES_LINK,
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
  const pathname = usePathname();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/entrar");
    }
  }, [status, router]);

  const isResponsavel = user?.role === "responsavel";
  const isEmployeeDriver = user?.role === "motorista" || user?.role === "monitor";
  const { mode, canToggle, setMode } = useAppMode(user);

  // Responsável não usa este fluxo (`SELF_VERIFICATION_ROLES` no
  // backend não inclui `responsavel`) — a query nem dispara pra ele,
  // pra nunca gerar um 403 à toa nem atrasar a home dele.
  const shouldCheckIdentity = status === "authenticated" && !isResponsavel;
  const { data: identityVerification, isLoading: isIdentityLoading } = useMyIdentityVerification({
    enabled: shouldCheckIdentity,
  });
  const isBlockedByIdentityVerification = identityVerification?.status === "REPROVADA";

  // "Em viagem agora" (Frente G, "inove"; Frente H estende pro
  // funcionário): só busca quando faz sentido — elegível ao alternador
  // OU motorista/monitor funcionário, fora da própria "Minha Rota"
  // (lá o aviso seria redundante) e sem nada bloqueando a tela. Chamado
  // incondicionalmente (Regra dos Hooks) — quem controla o custo de
  // rede é o `enabled` interno do hook, nunca pular a chamada em si.
  const isOnMinhaRota = pathname?.startsWith("/minha-rota") ?? false;
  const activeTrip = useMyActiveTrip(
    (canToggle || isEmployeeDriver) && !isOnMinhaRota && !isBlockedByIdentityVerification,
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
    : isEmployeeDriver
      ? EMPLOYEE_DRIVER_NAV
      : canToggle && mode === "acao"
        ? ACTION_NAV
        : canToggle
          ? [MINHA_ROTA_LINK, ...PROFISSIONAL_NAV]
          : PROFISSIONAL_NAV;

  // Quem roda a rota no dia a dia pelo celular (Frente K) — mesmo
  // público de `EMPLOYEE_DRIVER_NAV`/`ACTION_NAV` acima, nunca
  // Responsável/Empresa em Visão completa (esses continuam só com o
  // cabeçalho, pensado pra tela grande).
  const showDriverBottomNav = isEmployeeDriver || (canToggle && mode === "acao");

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
          {/* `pb-20` (Frente K) abre espaço pra `DriverBottomNav` fixa não cobrir o fim do conteúdo em tela pequena — `md:pb-6` volta ao normal onde ela some. */}
          <main className={`flex-1 p-6 ${showDriverBottomNav ? "pb-20 md:pb-6" : ""}`}>
            {children}
          </main>
          <LegalFooter />
          {showDriverBottomNav && <DriverBottomNav />}
        </>
      )}
    </div>
  );
}

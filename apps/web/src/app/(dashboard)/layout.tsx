"use client";

import { useAuth } from "@rotta/auth/web";
import { Button, Spinner, Typography } from "@rotta/ui/web";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import type { Route } from "next";

import { DriverBottomNav } from "@/components/driver-bottom-nav";
import { LegalFooter } from "@/components/legal/legal-footer";
import { ResponsavelBottomNav } from "@/components/responsavel-bottom-nav";
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
 * Motorista/Monitor FUNCIONÁRIO nunca vê esta lista (Frente H) nem o
 * dono autônomo/MEI em "Modo Ação" (Frente O, ver `showDriverNavBar`
 * mais abaixo): nenhum dos dois tem MAIS nenhum link de texto no
 * cabeçalho, só a barra de 4 ícones do `DriverBottomNav`.
 */
const PROFISSIONAL_NAV: NavLink[] = [
  { href: "/empresa", label: "Minha Empresa" },
  { href: "/equipe", label: "Equipe" },
  { href: "/alunos-pre-cadastro", label: "Alunos" },
  { href: "/veiculos", label: "Veículos" },
  { href: "/escolas", label: "Escolas" },
  { href: "/rotas", label: "Rotas" },
  { href: "/marketplace/solicitacoes", label: "Marketplace" },
  { href: "/rotta-pay", label: "Rotta Pay" },
  { href: "/verificacao-identidade", label: "Verificar identidade" },
  { href: "/notificacoes", label: "Notificações" },
  { href: "/chamados", label: "Chamados" },
];

const MINHA_ROTA_LINK: NavLink = { href: "/minha-rota", label: "Minha Rota" };

/**
 * Únicos destinos permitidos pra quem está com a barra de navegação em
 * 4 ícones (`showDriverNavBar` — Motorista/Monitor funcionário OU
 * autônomo/MEI em "Modo Ação"), espelhando os `href` de
 * `DriverBottomNav`. BUG corrigido aqui: antes desta correção, alternar
 * pra "Modo Ação" só trocava a NAVEGAÇÃO exibida — nenhuma rota
 * respeitava esse mesmo alternador, então quem já estava numa página de
 * gestão (ex.: `/empresa`) ou navegasse direto pela URL continuava
 * vendo TODAS as funcionalidades (dashboard, atalhos de Equipe/
 * Veículos/Escolas/Marketplace...) mesmo com o alternador marcado como
 * "Modo Ação" — o modo nunca era de fato aplicado à página atual, só ao
 * cabeçalho.
 *
 * BUG 2 corrigido aqui (reportado pelo usuário: "quando o motorista
 * está em 'modo de ação', ele não consegue clicar em nenhuma opção na
 * página de 'perfil'"): a lista só cobria os 4 destinos da barra
 * inferior, mas `ATALHOS_PERFIL` (`app/(dashboard)/perfil/page.tsx`)
 * linka pra 5 páginas fora dela — `/rotta-pay`, `/notificacoes`,
 * `/chamados`, `/verificacao-identidade`, `/legal`. Sem elas aqui, o
 * clique em qualquer atalho do Perfil navegava e era imediatamente
 * revertido pra `/minha-rota` por este mesmo guard, no próximo
 * `useEffect` — parecia que o botão não fazia nada.
 */
const DRIVER_MODE_ALLOWED_PREFIXES = [
  "/minha-rota",
  "/atividades",
  "/veiculo",
  "/perfil",
  "/rotta-pay",
  "/notificacoes",
  "/chamados",
  "/verificacao-identidade",
  "/legal",
  // "Registrar ocorrência" (modelo de referência do Monitor) virou uma
  // página cheia própria em vez de modal — precisa estar na lista ou o
  // guard acima manda de volta pra "Minha Rota" assim que o link é
  // clicado (mesmo bug já corrigido uma vez pro Perfil, ver comentário
  // "BUG 2" acima).
  "/ocorrencia",
] as const;

/**
 * Layout do route group `(dashboard)` — Painel Administrativo autenticado
 * (Empresa, Gestor, Escola, Responsável — Dossie 11, Secao 2/5), com o
 * AppShell (sidebar + cabecalho, Dossie 10 Secao 11.2).
 *
 * Toda rota sob este grupo exige sessão ativa (Dossiê 15) — nenhuma tela
 * individual reimplementa a checagem de autenticação, ela é garantida
 * estruturalmente por estar dentro deste layout (Dossiê 23, Secao 4.1).
 * A navegação exibida depende de `user.role` — `PROFISSIONAL_NAV` (links
 * de texto no cabeçalho) pra Empresa/Gestor/Escola, ou a barra fixa de 4
 * ícones embaixo (`DriverBottomNav`/`ResponsavelBottomNav`, Frente O/AO)
 * pro Motorista/Monitor/Autônomo em Modo Ação e pro Responsável — cada
 * rota individual dentro do grupo já é protegida pelo próprio backend
 * (RBAC/tenant), o papel deste `if` é só cosmético (não mostrar item que
 * não serve pro papel logado), nunca a única barreira de acesso.
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

  // Quem roda a rota no dia a dia (Frente K/O) — dono autônomo/MEI em
  // "Modo Ação" e Motorista/Monitor funcionário (esse nunca tem
  // `canToggle`, então nunca precisa do botão pra trocar de modo —
  // pedido do usuário: "sem questão botão para trocar o modo"). Pra
  // este público a barra de navegação vira só os 4 ícones do
  // `DriverBottomNav` (Início/Atividades/Veículo/Perfil, igual à
  // imagem de referência) — NENHUM link de texto adicional no
  // cabeçalho, nem em telas grandes (pedido explícito: "para todas as
  // plataformas, sem exceção"). Calculado aqui em cima (antes do
  // `return` de loading abaixo) só porque o guard de rota logo a seguir
  // é um Hook (`useEffect`) e precisa rodar sempre na mesma ordem.
  const showDriverNavBar = isEmployeeDriver || (canToggle && mode === "acao");

  // Guard de rota do "Modo Ação"/Motorista funcionário (bug reportado
  // pelo usuário: alternar pra "Modo Ação" só trocava a navegação
  // exibida, nunca a página em si — quem já estava em `/empresa` ou
  // navegasse direto pela URL continuava vendo todas as funcionalidades
  // de gestão mesmo com o alternador em "Modo Ação"). Redireciona pra
  // "Minha Rota" sempre que a rota atual não é uma das 4 permitidas —
  // dispara de novo a cada troca de `pathname`/`showDriverNavBar`
  // (inclusive logo após o clique no alternador, sem esperar navegação
  // manual). Não precisa checar o bloqueio por verificação de identidade
  // aqui: `isBlockedByIdentityVerification` troca a página renderizada
  // no `return` abaixo independente da rota — redirecionar antes disso
  // é inofensivo, o bloqueio aparece do mesmo jeito depois.
  useEffect(() => {
    if (!showDriverNavBar || !pathname) return;
    const isAllowed = DRIVER_MODE_ALLOWED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
    if (!isAllowed) router.replace("/minha-rota");
  }, [showDriverNavBar, pathname, router]);

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
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <Spinner size="lg" />
      </div>
    );
  }

  // Frente AO — o Responsável passou a usar a mesma barra de 4 ícones
  // fixa embaixo (`ResponsavelBottomNav`) das 3 imagens de referência,
  // então o cabeçalho de texto (`RESPONSAVEL_NAV`) sai daqui — mesmo
  // tratamento que `showDriverNavBar` já dava pro Motorista/Monitor/
  // Autônomo desde a Frente O.
  const navLinks = isResponsavel
    ? []
    : showDriverNavBar
      ? []
      : canToggle
        ? [MINHA_ROTA_LINK, ...PROFISSIONAL_NAV]
        : PROFISSIONAL_NAV;
  const showBottomNav = showDriverNavBar || isResponsavel;

  return (
    // `min-h-dvh` em vez de `min-h-screen` (BUG corrigido — mapa em tela
    // cheia não ocupava a tela toda no Safari/iOS): `100vh` no Safari
    // sempre mede o viewport como se a barra de endereço estivesse
    // recolhida, então o mapa de `minha-rota`/`alunos/[id]/mapa` (que
    // usa `dvh` também) acaba sobrando espaço/cortado por baixo dessa
    // casca ainda calculada em `vh`. `dvh` acompanha o tamanho real e
    // atual do viewport — junto com `viewportFit: "cover"` (`app/
    // layout.tsx`), fecha o problema de ponta a ponta.
    <div className="flex min-h-dvh flex-col bg-background text-text">
      <header className="flex items-center justify-between border-b border-border px-6 py-4">
        <div className="flex items-center gap-8">
          <Typography variant="subtitle">
            {isResponsavel ? (user?.nome ?? "Rotta") : (user?.companyName ?? "Rotta")}
          </Typography>
          {!isBlockedByIdentityVerification && navLinks.length > 0 && (
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
          {/*
            `pb-20` (Frente K/O, estendido à Frente AO pro Responsável) abre
            espaço pra barra de 4 ícones fixa não cobrir o fim do conteúdo —
            sempre visível pra este público (Frente O, "todas as
            plataformas, sem exceção"), então sem exceção de breakpoint aqui
            também: a barra continua idêntica em qualquer largura.
            A partir de `md`, só o ENQUADRAMENTO ao redor dela muda (pedido
            do usuário: "está muito cru" no desktop — manter a navegação
            igual, só refinar o visual): a página de Motorista/Monitor/
            Responsável é sempre uma coluna estreita (`max-w-2xl` dentro de
            cada tela) porque é uma tela de UMA AÇÃO por vez, não um painel
            de gestão — em vez de deixar essa coluna flutuando sozinha numa
            janela em branco, ela ganha um painel com fundo levemente
            diferenciado (`bg-muted/40`) e um cartão com borda/sombra em
            volta do conteúdo, a mesma leitura visual de qualquer app
            desktop que centraliza um fluxo de uma tela só.
          */}
          <main
            className={
              showBottomNav
                ? "flex-1 p-6 pb-24 md:flex md:justify-center md:bg-muted/40 md:px-6 md:py-10"
                : "flex-1 p-6"
            }
          >
            {showBottomNav ? (
              <div className="w-full md:max-w-3xl md:rounded-2xl md:border md:border-border md:bg-surface md:p-8 md:shadow-sm">
                {children}
              </div>
            ) : (
              children
            )}
          </main>
          <LegalFooter />
          {showDriverNavBar && <DriverBottomNav />}
          {isResponsavel && <ResponsavelBottomNav />}
        </>
      )}
    </div>
  );
}

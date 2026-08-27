"use client";

import { useAuth } from "@rotta/auth/web";
import { Lock, Menu, X } from "@rotta/icons";
import { Button, Spinner, Typography, openTrialLockModalFromOutsideReact } from "@rotta/ui/web";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import type { Route } from "next";

import { DriverBottomNav } from "@/components/driver-bottom-nav";
import { LegalFooter } from "@/components/legal/legal-footer";
import { NotificationBell } from "@/components/notification-bell";
import { ResponsavelBottomNav } from "@/components/responsavel-bottom-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { BillingBlockScreen } from "@/features/billing/components/billing-block-screen";
import { useAppMode } from "@/features/driver/hooks/use-app-mode";
import { useMyActiveTrip } from "@/features/driver/hooks/use-my-active-trip";
import { IdentityVerificationBlockScreen } from "@/features/identity-verification/components/identity-verification-block-screen";
import { PostSignupIdentityPopup } from "@/features/identity-verification/components/post-signup-identity-popup";
import { useMyIdentityVerification } from "@/features/identity-verification/hooks/use-identity-verification";
import { VehicleAdminReviewAcknowledgeModal } from "@/features/vehicles/components/vehicle-admin-review-acknowledge-modal";
import { recordCheckpoint } from "@/lib/render-checkpoint";
import { StaleBuildWatchdog } from "@/providers/stale-build-watchdog";


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
  { href: "/verificacao-identidade", label: "Verificar identidade" },
  { href: "/chamados", label: "Chamados" },
];

const MINHA_ROTA_LINK: NavLink = { href: "/minha-rota", label: "Minha Rota" };

/**
 * Faturamento (Dossiê 26) — únicas rotas que continuam 100% acessíveis
 * quando `user.billingBlocked` (pedido do usuário: "exceto no suporte,
 * que aí eles podem acionar o suporte"; `/assinatura` precisa ficar
 * aberta, senão ninguém bloqueado conseguiria pagar pra se desbloquear).
 */
const BILLING_EXEMPT_PREFIXES = ["/chamados", "/assinatura"] as const;

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
 * linka pra páginas fora dela — `/notificacoes`, `/chamados`,
 * `/verificacao-identidade`, `/legal`. Sem elas aqui, o clique em
 * qualquer atalho do Perfil navegava e era imediatamente revertido pra
 * `/minha-rota` por este mesmo guard, no próximo `useEffect` — parecia
 * que o botão não fazia nada.
 */
const DRIVER_MODE_ALLOWED_PREFIXES = [
  "/minha-rota",
  "/atividades",
  "/veiculo",
  "/perfil",
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
  // Fluxo novo "Criar Rota" (pedido do usuário: "no modo ação também
  // aparece essa opção") — motorista/monitor autônomo/MEI acessa
  // "Minhas Rotas"/"Nova rota"/execução a partir do atalho em Perfil
  // (`ATALHOS_PERFIL_MOTORISTA`); sem `/rotas` aqui, o guard acima
  // mandaria de volta pra "Minha Rota" assim que o atalho fosse
  // clicado — mesmo bug já corrigido antes pro Perfil e pra Ocorrência.
  "/rotas",
  // Frente AP (pedido do usuário: "deverá ter a questão de motoristas e
  // veículos no modo ação, lá no hambúrguer") — mesmo raciocínio de
  // `/rotas` acima: o dono autônomo/MEI ganhou os atalhos "Equipe" e
  // "Veículos" em Perfil (`ATALHOS_PERFIL_MOTORISTA`, só pra
  // `role === "empresa"`) pra cadastrar motorista adicional/veículo sem
  // trocar pra "Visão completa" — sem as duas linhas abaixo, o mesmo
  // bug de sempre: o clique navegaria e seria imediatamente revertido
  // pra "Minha Rota".
  "/equipe",
  "/veiculos",
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
  // Instrumentação temporária (ver `@/lib/render-checkpoint.ts` e a nota
  // grande em `rotas/[id]/page.tsx`) — 2ª reprodução ao vivo do "Server
  // Components render" mostrou que a falha acontece DEPOIS do render de
  // `RotaDetalheContent` ter chegado com sucesso até o Spinner de
  // "carregando" (último checkpoint visto: `retorno-spinner-carregando`)
  // — ou seja, fora do que essa instrumentação já cobria. Este layout
  // ENVOLVE toda página do painel mas não é coberto por nenhum
  // `SectionErrorBoundary` (esses só existem dentro de cada página) —
  // candidato natural pra onde a falha real pode estar, dado que os
  // checkpoints dentro da própria página não capturaram nada depois do
  // Spinner.
  recordCheckpoint("dashboard-layout:inicio-render");
  const { status, user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  // Frente B1 ("otimize a interface e web para celular"): abaixo de
  // `md`, `navLinks` (10 itens do Painel ERP) sai do cabeçalho fixo e
  // vira este painel embutido, aberto/fechado pelo hambúrguer — sem
  // isso, o `<nav>` sempre visível (`flex items-center gap-4`, sem
  // quebra nem colapso) ou estoura o cabeçalho ou empilha feio numa
  // tela de celular. A partir de `md`, nada muda (cabeçalho igual a
  // antes desta mudança).
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  // Fecha o painel sozinho ao trocar de rota (ex.: navegação pelo
  // botão "Voltar" do celular) — sem isso, o painel ficaria aberto por
  // cima do conteúdo da página seguinte.
  useEffect(() => {
    setIsMobileNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/entrar");
    }
  }, [status, router]);

  const isResponsavel = user?.role === "responsavel";
  const isEmployeeDriver = user?.role === "motorista" || user?.role === "monitor";
  const { mode, canToggle, setMode, isModeResolved } = useAppMode(user);

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
  // Ampliado de `=== "REPROVADA"` (pedido do usuário: "travar quase
  // tudo" até a identidade estar de fato aprovada) — antes só quem
  // tinha sido RECUSADO ficava bloqueado; NAO_INICIADA/EM_ANDAMENTO/
  // EM_ANALISE/EXPIRADA passavam batido e usavam o painel inteiro sem
  // nunca ter validado nada. `identityVerification == null` (ainda
  // carregando, ou não se aplica a este papel) nunca bloqueia à toa.
  const isBlockedByIdentityVerification =
    identityVerification != null && identityVerification.status !== "APROVADA";

  // Faturamento (Dossiê 26) — `billingBlocked` só existe pro papel
  // Empresa/Gestor (backend nunca marca `true` pros demais, mas o `&&`
  // abaixo é defesa em profundidade). Cadeado em cada item de nav
  // (exceto Chamados, sempre liberado) + bloqueio de página inteira em
  // qualquer rota fora de `BILLING_EXEMPT_PREFIXES` — mesmo padrão de
  // `isBlockedByIdentityVerification`, mas sem esconder a navegação (o
  // cadeado precisa aparecer visível ao lado de cada opção, não some).
  const isBillingBlocked = Boolean(user?.billingBlocked) && !isResponsavel;
  const isBillingBlockedHere =
    isBillingBlocked &&
    !BILLING_EXEMPT_PREFIXES.some((prefix) => (pathname ?? "").startsWith(prefix));

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

  recordCheckpoint("dashboard-layout:hooks-ok");

  // `canToggle && !isModeResolved` (Autônomo/MEI, "Modo Ação" ainda não
  // leu o localStorage) — CAUSA REAL do "Server Components render"
  // indeterminístico em `/rotas/[id]` recém-criada (achado real,
  // capturado direto no navegador: `TypeError: Cannot destructure
  // property 'segmentPath' of 'e' as it is undefined`, dentro do
  // próprio roteador do Next ao processar o PREFETCH de um `<Link>`
  // cancelado — ver HISTÓRICO em `useAppMode`). Sem este guard, o
  // primeiro render sempre "chutava" `mode = "completo"` e mostrava os
  // ~10 links de texto (`PROFISSIONAL_NAV`) por um instante — o Next
  // já começa a pré-carregar cada `<Link>` assim que ele aparece na
  // tela. Um instante depois, quando `mode` resolvia pra "acao" (users
  // que já tinham escolhido Modo Ação antes), esses `<Link>` eram
  // desmontados com o prefetch ainda em andamento — e ao tentar aplicar
  // o resultado desse prefetch órfão ao cache do roteador, o Next
  // quebrava a árvore INTEIRA da página (não só a navegação),
  // justamente enquanto `/rotas/[id]` estava hidratando pela primeira
  // vez. Esperar `isModeResolved` garante que o conjunto certo de
  // links já nasce certo no primeiro render — nenhum `<Link>` chega a
  // montar pra ser desmontado um instante depois.
  //
  // ACHADO REAL (esse fix acima, sozinho, NÃO bastou — reprodução ao
  // vivo confirmada de novo, mesmo depois dele publicado, e mesmo depois
  // de atualizar o Next pra 15.5.23): consultando os `ClientErrorReport`
  // reais em produção (`GET /client-errors`, Admin Rotta), todas as
  // ~100 ocorrências têm `digest: null`, nenhuma tem stack de verdade
  // (só o texto genérico do próprio Next) e nenhuma chega como
  // `window.onerror`/`unhandledrejection` — sempre via Error Boundary.
  // Os Runtime Logs da Vercel (`onRequestError`, `instrumentation.ts`)
  // ficam mudos nessas ocorrências: não há exceção nenhuma no
  // SERVIDOR. Ou seja, o problema é 100% client-side, sem digest — bate
  // com o mecanismo já documentado acima (aplicação de PREFETCH ao
  // cache do roteador), só que disparado por OUTRO `<Link>` que
  // continua fazendo prefetch normalmente mesmo com `isModeResolved`
  // certo: a barra de navegação inteira (topo, mobile, banner de viagem
  // ativa, `PortalBottomNav`) monta em TODA página do painel — inclusive
  // `/rotas/[id]` logo após criar uma rota — e cada `<Link>` dela começa
  // a pré-carregar sozinho assim que aparece, concorrendo com o
  // carregamento da própria página que acabou de abrir. `prefetch={false}`
  // em todos eles (aqui e em `portal-bottom-nav.tsx`) remove esse
  // gatilho concorrente por completo, sem desistir de SSR nem duplicar
  // lógica — só deixa de pré-carregar destinos que o usuário talvez nem
  // visite, uma perda de performance pequena perto do app quebrar
  // inteiro.
  if (
    status !== "authenticated" ||
    (shouldCheckIdentity && isIdentityLoading) ||
    (canToggle && !isModeResolved)
  ) {
    recordCheckpoint("dashboard-layout:retorno-spinner-auth-carregando");
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <Spinner size="lg" />
      </div>
    );
  }
  recordCheckpoint("dashboard-layout:autenticado-vai-renderizar-shell");

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
  recordCheckpoint("dashboard-layout:antes-do-jsx-final");

  /**
   * Um item de navegação — vira um cadeado (sem navegar, abre o mesmo
   * pop-up de qualquer ação bloqueada) quando `isBillingBlocked` e o
   * link não é "Chamados" (sempre liberado). Usado tanto no cabeçalho
   * desktop quanto no painel mobile — evita duplicar a condicional nos
   * dois lugares.
   */
  function renderNavLink(link: NavLink, onNavigate?: () => void): JSX.Element {
    const isLocked = isBillingBlocked && link.href !== "/chamados";
    if (isLocked) {
      return (
        <button
          key={link.href}
          type="button"
          onClick={() => openTrialLockModalFromOutsideReact(user?.billingBlockedReason ?? "")}
          className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-left text-sm text-text-muted transition-colors hover:bg-muted/40 hover:text-text md:px-0 md:py-0 md:hover:bg-transparent"
        >
          {link.label}
          <Lock size={13} className="text-danger" aria-label="Requer assinatura" />
        </button>
      );
    }
    return (
      <Link
        key={link.href}
        href={link.href}
        prefetch={false}
        onClick={onNavigate}
        className="rounded-lg px-3 py-2 text-sm text-text-muted transition-colors hover:bg-muted/40 hover:text-text md:px-0 md:py-0 md:hover:bg-transparent"
      >
        {link.label}
      </Link>
    );
  }

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
      <StaleBuildWatchdog />
      {shouldCheckIdentity && user && identityVerification ? (
        <PostSignupIdentityPopup userId={user.id} status={identityVerification.status} />
      ) : null}
      {isResponsavel && <VehicleAdminReviewAcknowledgeModal />}
      <header className="flex items-center justify-between border-b border-border px-4 py-4 sm:px-6">
        <div className="flex items-center gap-8">
          <Typography variant="subtitle">
            {isResponsavel ? (user?.nome ?? "Rotta") : (user?.companyName ?? "Rotta")}
          </Typography>
          {!isBlockedByIdentityVerification && navLinks.length > 0 && (
            <nav className="hidden items-center gap-4 md:flex">
              {navLinks.map((link) => renderNavLink(link))}
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
          {!showBottomNav && !isBlockedByIdentityVerification && <NotificationBell />}
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
          {!isBlockedByIdentityVerification && navLinks.length > 0 && (
            <button
              type="button"
              aria-label={isMobileNavOpen ? "Fechar menu" : "Abrir menu"}
              aria-expanded={isMobileNavOpen}
              onClick={() => setIsMobileNavOpen((open) => !open)}
              className="flex items-center justify-center rounded-lg border border-border p-2 text-text-muted transition-colors hover:text-text md:hidden"
            >
              {isMobileNavOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          )}
        </div>
      </header>
      {!isBlockedByIdentityVerification && navLinks.length > 0 && isMobileNavOpen && (
        <nav className="flex flex-col gap-1 border-b border-border bg-surface px-4 py-3 md:hidden">
          {navLinks.map((link) => renderNavLink(link, () => setIsMobileNavOpen(false)))}
        </nav>
      )}
      {activeTrip && !isBlockedByIdentityVerification && (
        <Link
          href="/minha-rota"
          prefetch={false}
          className="flex items-center justify-center gap-2 bg-primary px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          {activeTrip.status === "EM_ANDAMENTO" ? "🚐 Em viagem agora" : "⏸️ Viagem pausada"}:{" "}
          {activeTrip.routeNome} · Ir para Minha Rota
        </Link>
      )}
      {isBlockedByIdentityVerification ? (
        <IdentityVerificationBlockScreen
          status={identityVerification.status}
          motivo={identityVerification.motivo}
        />
      ) : isBillingBlockedHere ? (
        <BillingBlockScreen reason={user?.billingBlockedReason ?? null} />
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

            CAUSA REAL do "Server Components render" indeterminístico em
            `/rotas/[id]` recém-criada (achado nesta investigação, 3
            ocorrências reais reproduzidas, sempre no mesmo checkpoint —
            ver `rotas/[id]/_components/route-detail-client.tsx`): este
            `{children}` ficava ora filho DIRETO de `<main>` (quando
            `showBottomNav` é `false`), ora encapsulado dentro de uma
            `<div>` extra (quando `true`) — dois formatos de árvore
            DIFERENTES pro mesmo conteúdo. `showBottomNav` depende de
            `useAppMode`'s `useEffect` (só dispara DEPOIS do primeiro
            render, nunca durante) — pra conta Autônomo/MEI, ele troca
            `mode` de "completo" pra "acao" pouco depois de montar, ou
            seja, o wrapper de `{children}` mudava de forma bem no meio
            da hidratação. O React não consegue reconciliar isso como uma
            atualização — desmonta e remonta TODA a árvore de `{children}`
            (inclusive toda a página `/rotas/[id]`) nesse instante exato,
            justamente enquanto essa mesma página está hidratando um
            segmento dinâmico 100% novo pela primeira vez (a rota recém-
            criada) — o mesmo tipo de instabilidade documentado alhures
            neste código como exclusivo de produção/Vercel. Corrigido
            mantendo `{children}` SEMPRE na mesma posição da árvore (um
            único wrapper, variando só a classe CSS) — nunca mais alterna
            entre "filho direto" e "encapsulado".
          */}
          <main
            className={
              showBottomNav
                ? "flex-1 p-6 pb-24 md:flex md:justify-center md:bg-muted/40 md:px-6 md:py-10"
                : "flex-1 p-6"
            }
          >
            <div
              className={
                showBottomNav
                  ? "w-full md:max-w-3xl md:rounded-2xl md:border md:border-border md:bg-surface md:p-8 md:shadow-sm"
                  : "contents"
              }
            >
              {children}
            </div>
          </main>
          <LegalFooter />
          {showDriverNavBar && <DriverBottomNav />}
          {isResponsavel && <ResponsavelBottomNav />}
        </>
      )}
    </div>
  );
}

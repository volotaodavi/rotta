"use client";

import { useAuth } from "@rotta/auth/web";
import {
  BarChart3,
  Bell,
  Building2,
  Bug,
  Car,
  ChevronDown,
  ClipboardCheck,
  DollarSign,
  Eye,
  EyeOff,
  FileText,
  GraduationCap,
  HeartPulse,
  Home,
  Layers,
  LogOut,
  Megaphone,
  MessageCircle,
  Plus,
  Radar,
  ScrollText,
  Search,
  ShieldCheck,
  Store,
} from "@rotta/icons";
import { Spinner, Typography, buttonVariants } from "@rotta/ui/web";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";

import type { LucideIcon } from "@rotta/icons";
import type { Route } from "next";

import { ThemeToggle } from "@/components/theme-toggle";
import { useBackofficeDashboard } from "@/features/backoffice/hooks/use-backoffice";
import { useClickOutside } from "@/hooks/use-click-outside";
import { PrivacyProvider, usePrivacy } from "@/providers/privacy-provider";

interface NavItem {
  href: Route;
  label: string;
  icon: LucideIcon;
  /** Fonte do número do badge — busca em `useBackofficeDashboard()`, nunca um número fixo. */
  badge?: "aprovacoes" | "chamados";
}

/**
 * Navegação principal (Frente Mercury, pedido do usuário: "pegue de
 * exemplo esse design e transforme a tela do admin" — banner de
 * referência de um painel bancário com sidebar de ícones). Mesmas 9
 * rotas que já existiam no cabeçalho horizontal antigo, agora com ícone
 * + badge de pendência real onde faz sentido (Aprovações/Suporte) —
 * nenhuma rota nova inventada, só reorganizada.
 */
const NAV_PRINCIPAL: NavItem[] = [
  { href: "/", label: "Painel", icon: Home },
  { href: "/aprovacoes", label: "Aprovações", icon: ClipboardCheck, badge: "aprovacoes" },
  { href: "/suporte", label: "Suporte", icon: MessageCircle, badge: "chamados" },
  { href: "/avisos", label: "Avisos", icon: Megaphone },
  { href: "/inteligencia", label: "Inteligência", icon: BarChart3 },
  { href: "/empresas", label: "Empresas", icon: Building2 },
  { href: "/veiculos", label: "Veículos", icon: Car },
  { href: "/monitoramento", label: "Monitoramento", icon: Radar },
  { href: "/escolas", label: "Escolas", icon: GraduationCap },
  { href: "/marketplace/solicitacoes", label: "Marketplace", icon: Store },
  { href: "/verificacao-identidade", label: "Verificação de identidade", icon: ShieldCheck },
];

/**
 * Segundo grupo da sidebar (rótulo próprio, mesmo papel visual de
 * "Workflows" no banner de referência) — as 3 rotas que sobravam do
 * cabeçalho antigo, todas sobre a PLATAFORMA em si (não sobre uma
 * operação do dia a dia de uma empresa/rota específica).
 */
const NAV_PLATAFORMA: NavItem[] = [
  { href: "/saude", label: "Saúde", icon: HeartPulse },
  { href: "/financeiro", label: "Financeiro", icon: DollarSign },
  { href: "/planos", label: "Planos", icon: Layers },
  { href: "/documentos-legais", label: "Documentos legais", icon: FileText },
  { href: "/auditoria-legal", label: "Auditoria legal", icon: ScrollText },
  { href: "/erros-cliente", label: "Erros do cliente", icon: Bug },
];

function NavLink({ item, count }: { item: NavItem; count: number | undefined }): JSX.Element {
  const pathname = usePathname();
  const isActive =
    item.href === "/" ? pathname === "/" : (pathname?.startsWith(item.href) ?? false);

  return (
    <Link
      href={item.href}
      className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
        isActive
          ? "bg-primary/10 font-semibold text-primary"
          : "text-text-muted hover:bg-muted hover:text-text"
      }`}
    >
      <item.icon size={18} className="shrink-0" />
      <span className="flex-1 truncate">{item.label}</span>
      {count !== undefined && count > 0 && (
        <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-warning/15 px-1.5 text-[11px] font-semibold text-warning">
          {count}
        </span>
      )}
    </Link>
  );
}

/**
 * Busca do cabeçalho — pedido do usuário: "não quero botão fake, quero
 * botão que funcione e dê resultado". Aperta Enter ou clica na lupa e
 * navega de verdade pra `/empresas?search=...`; a própria página de
 * Empresas lê esse parâmetro da URL e já chega com o filtro aplicado
 * (`empresas/page.tsx`) — nenhuma busca "decorativa" que não leva a
 * lugar nenhum.
 */
function TopbarSearch(): JSX.Element {
  const router = useRouter();
  const [valor, setValor] = useState("");

  function buscar(): void {
    const termo = valor.trim();
    if (!termo) return;
    router.push(`/empresas?search=${encodeURIComponent(termo)}` as Route);
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        buscar();
      }}
      className="flex flex-1 items-center gap-2 rounded-md border border-border bg-surface px-3 py-2"
    >
      <Search size={16} className="shrink-0 text-text-muted" />
      <input
        type="search"
        value={valor}
        onChange={(event) => setValor(event.target.value)}
        placeholder="Buscar empresa por nome ou CNPJ"
        className="w-full bg-transparent text-sm text-text placeholder:text-placeholder outline-none"
      />
    </form>
  );
}

/** "Ações rápidas" — substitui o "Move money" do banner de referência: 3 destinos reais, cada um leva a uma tela que existe. */
function AcoesRapidasMenu(): JSX.Element {
  const [aberto, setAberto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, () => setAberto(false));

  const ACOES: { href: Route; label: string; icon: LucideIcon }[] = [
    { href: "/empresas/nova", label: "Nova empresa", icon: Plus },
    { href: "/aprovacoes", label: "Ver aprovações", icon: ClipboardCheck },
    { href: "/suporte", label: "Ver chamados", icon: MessageCircle },
  ];

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setAberto((current) => !current)}
        aria-expanded={aberto}
        aria-haspopup="menu"
        className="flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm font-medium text-text transition-colors hover:bg-muted"
      >
        Ações rápidas
        <ChevronDown
          size={14}
          className={aberto ? "rotate-180 transition-transform" : "transition-transform"}
        />
      </button>
      {/*
        BUG corrigido (usuário: "clicar duas vezes para ir em uma
        opção", Safari/iOS, pedido pra corrigir em todas as plataformas)
        — o mesmo padrão do menu mobile de `(marketing)/layout.tsx`:
        este dropdown só existia no DOM enquanto `aberto` era `true`, e
        cada `<Link>` de dentro fechava o menu no MESMO clique que
        deveria navegar. O React desmontava o `<a>` tocado antes do
        Safari terminar de processar a navegação padrão, cancelando-a —
        só o segundo toque (já sem o dropdown no caminho) funcionava.
        Correção: fica sempre montado, só alterna `hidden`.
      */}
      <div
        role="menu"
        className={`absolute right-0 top-full z-30 mt-2 w-56 rounded-md border border-border bg-card py-1 shadow-lg ${aberto ? "" : "hidden"}`}
      >
        {ACOES.map((acao) => (
          <Link
            key={acao.href}
            href={acao.href}
            role="menuitem"
            onClick={() => setAberto(false)}
            className="flex items-center gap-2.5 px-3 py-2 text-sm text-text transition-colors hover:bg-muted"
          >
            <acao.icon size={16} className="text-text-muted" />
            {acao.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

function AvatarMenu({
  nome,
  email,
  onSair,
}: {
  nome: string;
  email: string;
  onSair: () => void;
}): JSX.Element {
  const [aberto, setAberto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, () => setAberto(false));

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setAberto((current) => !current)}
        aria-expanded={aberto}
        aria-haspopup="menu"
        aria-label="Menu da conta"
        className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-white"
      >
        {nome.charAt(0).toUpperCase()}
      </button>
      {aberto && (
        <div
          role="menu"
          className="absolute right-0 top-full z-30 mt-2 w-64 rounded-md border border-border bg-card py-1 shadow-lg"
        >
          <div className="border-b border-border px-3 py-2.5">
            <Typography variant="bodySmall" className="font-semibold">
              {nome}
            </Typography>
            <Typography variant="caption" color="muted" className="truncate">
              {email}
            </Typography>
          </div>
          <button
            type="button"
            role="menuitem"
            onClick={onSair}
            className="flex w-full items-center gap-2.5 px-3 py-2.5 text-sm text-danger transition-colors hover:bg-muted"
          >
            <LogOut size={16} />
            Sair
          </button>
        </div>
      )}
    </div>
  );
}

function AdminTopbar(): JSX.Element {
  const { user, logout } = useAuth();
  const router = useRouter();
  const { hidden, toggle } = usePrivacy();
  const { data } = useBackofficeDashboard();
  const pendencias = (data?.aprovacoesPendentesTotal ?? 0) + (data?.chamadosAbertos ?? 0);

  return (
    <header className="flex items-center gap-3 border-b border-border px-6 py-3">
      <TopbarSearch />
      <AcoesRapidasMenu />
      <button
        type="button"
        onClick={toggle}
        aria-label={hidden ? "Mostrar valores" : "Ocultar valores"}
        aria-pressed={hidden}
        title={hidden ? "Mostrar valores" : "Ocultar valores"}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-muted hover:text-text"
      >
        {hidden ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
      <Link
        href="/aprovacoes"
        aria-label={`${pendencias} pendência(s)`}
        title={`${pendencias} pendência(s) entre aprovações e chamados`}
        className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-muted hover:text-text"
      >
        <Bell size={18} />
        {pendencias > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-warning px-1 text-[10px] font-bold text-white">
            {pendencias > 99 ? "99+" : pendencias}
          </span>
        )}
      </Link>
      <ThemeToggle />
      <AvatarMenu
        nome={user?.nome ?? "Admin"}
        email={user?.email ?? ""}
        onSair={() => {
          void logout().then(() => router.replace("/entrar"));
        }}
      />
    </header>
  );
}

function AdminSidebar(): JSX.Element {
  const { data } = useBackofficeDashboard();
  const counts: Record<"aprovacoes" | "chamados", number> = {
    aprovacoes: data?.aprovacoesPendentesTotal ?? 0,
    chamados: data?.chamadosAbertos ?? 0,
  };

  return (
    <aside className="flex w-64 shrink-0 flex-col gap-6 border-r border-border px-3 py-5">
      <Link href="/" className="flex items-center gap-2 px-2">
        <Image src="/brand/rotta-mark-512.png" alt="Rotta" width={28} height={28} priority />
        <Typography variant="subtitle">Rotta Admin</Typography>
      </Link>

      <nav className="flex flex-col gap-0.5">
        {NAV_PRINCIPAL.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            count={item.badge ? counts[item.badge] : undefined}
          />
        ))}
      </nav>

      <div className="flex flex-col gap-1">
        <Typography variant="overline" color="muted" className="px-3 uppercase tracking-wide">
          Plataforma
        </Typography>
        <nav className="flex flex-col gap-0.5">
          {NAV_PLATAFORMA.map((item) => (
            <NavLink key={item.href} item={item} count={undefined} />
          ))}
        </nav>
      </div>

      <div className="mt-auto">
        <Link
          href="/empresas/nova"
          className={buttonVariants({ variant: "primary", fullWidth: true })}
        >
          <Plus className="h-4 w-4" />
          Nova empresa
        </Link>
      </div>
    </aside>
  );
}

/**
 * Layout do painel administrativo interno (Dossie 11, Secao 6) —
 * clientes/tenants, suporte, financeiro, logs, metricas.
 *
 * Exige sessão ativa E papel `admin_rotta` (Dossiê 12 §4.5 — perfil de
 * acesso cross-tenant, nunca compartilhado com nenhum outro papel,
 * mesmo princípio estrutural do `(dashboard)/layout.tsx` de apps/web).
 *
 * Sidebar + cabeçalho com busca/ações rápidas/ocultar valores/
 * notificações/conta (Frente Mercury, pedido do usuário — banner de
 * referência de um painel bancário): substitui o cabeçalho horizontal
 * com 12 links de texto que existia antes por uma navegação em duas
 * colunas, mesma ideia visual, todas as rotas reais preservadas.
 */
export default function AdminLayout({ children }: { children: ReactNode }): JSX.Element {
  const { status, user } = useAuth();
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
    <PrivacyProvider>
      <div className="flex min-h-screen bg-background text-text">
        <AdminSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <AdminTopbar />
          <main className="flex-1 p-6">{children}</main>
        </div>
      </div>
    </PrivacyProvider>
  );
}

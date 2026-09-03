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
  Menu,
  MessageCircle,
  Plus,
  Radar,
  ScrollText,
  Search,
  ShieldCheck,
  Store,
  Users,
} from "@rotta/icons";
import { Spinner, Typography, buttonVariants } from "@rotta/ui/web";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";

import type { AdminRottaPapel } from "@rotta/api-client";
import type { LucideIcon } from "@rotta/icons";
import type { Route } from "next";

import { ThemeToggle } from "@/components/theme-toggle";
import { useBackofficeDashboard } from "@/features/backoffice/hooks/use-backoffice";
import { useClickOutside } from "@/hooks/use-click-outside";
import { defaultRouteForAdminPapel, isAdminRouteAllowed } from "@/lib/admin-area-access";
import { PrivacyProvider, usePrivacy } from "@/providers/privacy-provider";


interface NavItem {
  href: Route;
  label: string;
  icon: LucideIcon;
  /** Fonte do número do badge — busca em `useBackofficeDashboard()`, nunca um número fixo. */
  badge?: "aprovacoes" | "chamados";
}

interface NavGroup {
  id: string;
  label: string;
  icon: LucideIcon;
  items: NavItem[];
}

/**
 * Painel e Inteligência ficam soltos (não fazem parte de nenhum
 * grupo temático — cada um é a raiz da própria seção). O resto (eram
 * 17 itens soltos na sidebar, pedido do usuário 03/09/2026: "tem muitas
 * abas soltas... por que não cria subabas que serão incorporadas por
 * abas sêniores?") virou 3 grupos recolhíveis por tema — ver
 * `NAV_GROUPS` logo abaixo.
 */
const NAV_STANDALONE: NavItem[] = [
  { href: "/", label: "Painel", icon: Home },
  { href: "/inteligencia", label: "Inteligência", icon: BarChart3 },
];

/**
 * Sub-abas agrupadas por tema (pedido do usuário 03/09/2026) —
 * substitui a lista plana antiga (`NAV_PRINCIPAL`/`NAV_PLATAFORMA`,
 * 17 itens soltos). Cada grupo abre/fecha (`NavGroupAccordion`);
 * abre sozinho quando a rota atual é uma das suas sub-abas
 * (`AdminSidebar`), senão começa fechado. Nenhuma rota nova, nenhuma
 * removida — só reorganizadas.
 */
const NAV_GROUPS: NavGroup[] = [
  {
    id: "atendimento",
    label: "Atendimento",
    icon: MessageCircle,
    items: [
      { href: "/aprovacoes", label: "Aprovações", icon: ClipboardCheck, badge: "aprovacoes" },
      { href: "/suporte", label: "Suporte", icon: MessageCircle, badge: "chamados" },
      { href: "/avisos", label: "Avisos", icon: Megaphone },
      { href: "/verificacao-identidade", label: "Verificação de identidade", icon: ShieldCheck },
    ],
  },
  {
    id: "operacao",
    label: "Operação",
    icon: Building2,
    items: [
      { href: "/empresas", label: "Empresas", icon: Building2 },
      { href: "/veiculos", label: "Veículos", icon: Car },
      { href: "/monitoramento", label: "Monitoramento", icon: Radar },
      { href: "/escolas", label: "Escolas", icon: GraduationCap },
      { href: "/marketplace/solicitacoes", label: "Marketplace", icon: Store },
    ],
  },
  {
    id: "plataforma",
    label: "Plataforma",
    icon: Layers,
    items: [
      { href: "/saude", label: "Saúde", icon: HeartPulse },
      { href: "/financeiro", label: "Financeiro", icon: DollarSign },
      { href: "/planos", label: "Planos", icon: Layers },
      { href: "/documentos-legais", label: "Documentos legais", icon: FileText },
      { href: "/auditoria-legal", label: "Auditoria legal", icon: ScrollText },
      { href: "/erros-cliente", label: "Erros do cliente", icon: Bug },
      // Só aparece pra quem já enxerga a rota (`isAdminRouteAllowed`) —
      // na prática só Admin Geral, já que SUPORTE/FINANCEIRO nunca têm
      // `/admin-contas` no próprio allowlist (pedido do usuário
      // 03/09/2026: "crie outros acessos... com particularidades").
      { href: "/admin-contas", label: "Contas Admin", icon: Users },
    ],
  },
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

/**
 * Cabeçalho do Admin — responsivo (pedido do usuário 03/09/2026: "no
 * celular, a parada tem que ter o mesmo sentido, porém com outro
 * layout"). Busca/"Ações rápidas" somem abaixo de `md` (viram peso
 * morto num celular estreito, a pessoa já tem a sidebar/o botão de
 * menu pra chegar em qualquer tela); o essencial (privacidade,
 * notificações, tema, conta) continua sempre visível.
 */
function AdminTopbar({ onMenuClick }: { onMenuClick: () => void }): JSX.Element {
  const { user, logout } = useAuth();
  const router = useRouter();
  const { hidden, toggle } = usePrivacy();
  const { data } = useBackofficeDashboard();
  const pendencias = (data?.aprovacoesPendentesTotal ?? 0) + (data?.chamadosAbertos ?? 0);

  return (
    <header className="flex items-center gap-3 border-b border-border px-4 py-3 sm:px-6">
      <button
        type="button"
        onClick={onMenuClick}
        aria-label="Abrir menu"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-muted hover:text-text lg:hidden"
      >
        <Menu size={20} />
      </button>
      <div className="hidden min-w-0 flex-1 items-center gap-3 md:flex">
        <TopbarSearch />
        <AcoesRapidasMenu />
      </div>
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

/**
 * Um grupo recolhível na sidebar (pedido do usuário 03/09/2026: "cria
 * subabas que serão incorporadas por abas sêniores"). Abre sozinho
 * quando a rota atual é uma das sub-abas (`defaultOpen`), senão começa
 * fechado — nunca esconde onde a pessoa já está. O selo de contagem
 * (aprovações/chamados) soma os badges de TODAS as sub-abas: mesmo
 * fechado, dá pra ver que tem pendência lá dentro sem precisar abrir.
 */
function NavGroupAccordion({
  group,
  counts,
  defaultOpen,
}: {
  group: NavGroup;
  counts: Record<"aprovacoes" | "chamados", number>;
  defaultOpen: boolean;
}): JSX.Element {
  const [open, setOpen] = useState(defaultOpen);
  const totalBadge = group.items.reduce(
    (soma, item) => soma + (item.badge ? counts[item.badge] : 0),
    0,
  );

  return (
    <div className="flex flex-col gap-0.5">
      <button
        type="button"
        onClick={() => setOpen((atual) => !atual)}
        aria-expanded={open}
        className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-text-muted transition-colors hover:bg-muted hover:text-text"
      >
        <group.icon size={18} className="shrink-0" />
        <span className="flex-1 truncate text-left font-medium">{group.label}</span>
        {totalBadge > 0 && (
          <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-warning/15 px-1.5 text-[11px] font-semibold text-warning">
            {totalBadge}
          </span>
        )}
        <ChevronDown
          size={14}
          className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <nav className="flex flex-col gap-0.5 py-0.5 pl-4">
          {group.items.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              count={item.badge ? counts[item.badge] : undefined}
            />
          ))}
        </nav>
      )}
    </div>
  );
}

/**
 * Vira uma gaveta (drawer) abaixo de `lg` (pedido do usuário
 * 03/09/2026: "no celular, a parada tem que ter o mesmo sentido,
 * porém com outro layout") — antes disso a sidebar de 256px fixos
 * nunca se escondia, o conteúdo real da tela ficava espremido numa
 * faixa estreitíssima ao lado dela em qualquer celular. `open`/
 * `onClose` só têm efeito abaixo de `lg` (`translate-x-0 lg:translate-x-0`
 * sempre visível em telas grandes, independente do estado).
 */
function AdminSidebar({
  papel,
  open,
  onClose,
}: {
  papel: AdminRottaPapel | undefined;
  open: boolean;
  onClose: () => void;
}): JSX.Element {
  const pathname = usePathname();
  const { data } = useBackofficeDashboard();
  const counts: Record<"aprovacoes" | "chamados", number> = {
    aprovacoes: data?.aprovacoesPendentesTotal ?? 0,
    chamados: data?.chamadosAbertos ?? 0,
  };
  // Ver `admin-area.guard.ts` (backend) — este filtro só controla o que
  // APARECE aqui, nunca é a autorização de verdade (o guard recusa a
  // rota de qualquer jeito, mesmo com o link escondido).
  const standalone = NAV_STANDALONE.filter((item) => isAdminRouteAllowed(papel, item.href));
  const groups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => isAdminRouteAllowed(papel, item.href)),
  })).filter((group) => group.items.length > 0);

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 shrink-0 flex-col gap-2 overflow-y-auto border-r border-border bg-background px-3 py-5 transition-transform duration-200 lg:static lg:z-auto lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Link href="/" className="mb-4 flex items-center gap-2 px-2" onClick={onClose}>
          <Image src="/brand/rotta-mark-512.png" alt="Rotta" width={28} height={28} priority />
          <Typography variant="subtitle">Rotta Admin</Typography>
        </Link>

        {standalone.length > 0 && (
          <nav className="flex flex-col gap-0.5">
            {standalone.map((item) => (
              <NavLink
                key={item.href}
                item={item}
                count={item.badge ? counts[item.badge] : undefined}
              />
            ))}
          </nav>
        )}

        {groups.map((group) => (
          <NavGroupAccordion
            key={group.id}
            group={group}
            counts={counts}
            defaultOpen={group.items.some(
              (item) => pathname === item.href || (pathname?.startsWith(item.href) ?? false),
            )}
          />
        ))}

        {/* "Nova empresa" é uma ação operacional geral — mesmo raciocínio de `/`, só faz sentido pra quem tem acesso total. */}
        {(!papel || papel === "GERAL") && (
          <div className="mt-auto">
            <Link
              href="/empresas/nova"
              className={buttonVariants({ variant: "primary", fullWidth: true })}
            >
              <Plus className="h-4 w-4" />
              Nova empresa
            </Link>
          </div>
        )}
      </aside>
    </>
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
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Fecha a gaveta sozinha ao navegar — a pessoa já chegou onde queria,
  // não devia precisar de um segundo toque só pra tirar o menu do caminho.
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/entrar");
    } else if (status === "authenticated" && user?.role !== "admin_rotta") {
      router.replace("/entrar");
    } else if (
      status === "authenticated" &&
      pathname &&
      !isAdminRouteAllowed(user?.adminPapel, pathname)
    ) {
      // Sub-papel restrito (SUPORTE/FINANCEIRO) tentando uma rota fora
      // do próprio escopo — o backend já recusaria a chamada de
      // qualquer jeito (`AdminAreaGuard`), isto só evita a tela quebrada
      // de "carregando pra sempre"/erro genérico, manda pro destino
      // certo direto.
      router.replace(defaultRouteForAdminPapel(user?.adminPapel));
    }
  }, [status, user, router, pathname]);

  if (
    status !== "authenticated" ||
    user?.role !== "admin_rotta" ||
    (pathname && !isAdminRouteAllowed(user.adminPapel, pathname))
  ) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <PrivacyProvider>
      <div className="flex min-h-screen bg-background text-text">
        <AdminSidebar
          papel={user.adminPapel}
          open={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <AdminTopbar onMenuClick={() => setMobileMenuOpen(true)} />
          <main className="flex-1 p-4 sm:p-6">{children}</main>
        </div>
      </div>
    </PrivacyProvider>
  );
}

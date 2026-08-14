"use client";

import { Menu, X } from "@rotta/icons";
import Link from "next/link";
import { useState } from "react";

import type { Route } from "next";
import type { ReactNode } from "react";

import { LEGAL_FOOTER_LINKS } from "@/components/legal/legal-footer-links";
import { pillGhostSm, pillPrimarySm } from "@/components/pill-button-classes";
import { RouteMark } from "@/components/route-mark";
import { ThemeToggle } from "@/components/theme-toggle";


const NAV_LINKS: { href: Route; label: string }[] = [
  { href: "/planos", label: "Planos" },
  { href: "/beneficios", label: "Benefícios" },
  { href: "/faq", label: "FAQ" },
  { href: "/contato", label: "Contato" },
  { href: "/suporte", label: "Suporte" },
];

interface FooterColumn {
  titulo: string;
  links: { href: Route; label: string }[];
}

const ROTTA_INSTAGRAM_URL = "https://www.instagram.com/rotta_app/";

/**
 * Glifo do Instagram desenhado à mão (contorno genérico de câmera —
 * não é o logotipo/marca registrada da Meta) — a versão do Lucide
 * Icons usada neste monorepo (Dossiê 10, Seção 4) não inclui ícones de
 * marca de terceiros (removidos do pacote core há algumas versões).
 */
function InstagramGlyph({ className }: { className?: string }): JSX.Element {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

const FOOTER_COLUNAS: FooterColumn[] = [
  {
    titulo: "Produto",
    links: [
      { href: "/planos", label: "Planos" },
      { href: "/beneficios", label: "Benefícios" },
      { href: "/#seguranca", label: "Segurança" },
      { href: "/blog", label: "Blog" },
    ],
  },
  {
    titulo: "Para você",
    links: [
      { href: "/criar-conta/pessoal", label: "Sou responsável" },
      { href: "/criar-conta/empresa", label: "Sou transportadora" },
      { href: "/criar-conta/profissional", label: "Sou motorista/monitor" },
    ],
  },
  {
    titulo: "Conta",
    links: [
      { href: "/entrar", label: "Entrar" },
      { href: "/criar-conta", label: "Criar conta" },
    ],
  },
  {
    titulo: "Ajuda",
    links: [
      { href: "/faq", label: "FAQ" },
      { href: "/suporte", label: "Suporte" },
      { href: "/contato", label: "Contato" },
    ],
  },
  {
    /**
     * Dossiê 45 (Rotta Legal, Trust & Community Center) — a mesma lista
     * (`LEGAL_FOOTER_LINKS`) usada no rodapé do painel autenticado
     * (`(dashboard)/layout.tsx`) e no rodapé de `/legal/*`, nunca
     * duplicada.
     */
    titulo: "Rotta",
    links: LEGAL_FOOTER_LINKS,
  },
];

/**
 * Layout do route group `(marketing)` — Landing Page + Site público
 * (Dossie 11, Secao 1; briefing "ROTTA DIGITAL EXPERIENCE"). Header
 * fixo (sticky + blur) com marca (ver `RouteMark`) e rodapé denso em
 * colunas (Produto/Para você/Conta/Ajuda + barra inferior com idioma) —
 * estrutura inspirada no rodapé multi-coluna da Uber, sem reaproveitar
 * cor ou copy das referências, e sem nenhum link fabricado (só rotas
 * reais deste site — nenhum badge de app store, já que o app da Rotta
 * ainda não tem ficha pública na App Store/Play Store). Abaixo de `md`,
 * a navegação migra para um menu de disclosure (antes desaparecia sem
 * substituto).
 */
export default function MarketingLayout({ children }: { children: ReactNode }): JSX.Element {
  const [menuAberto, setMenuAberto] = useState(false);

  return (
    <div className="flex min-h-screen flex-col bg-marketing-canvas text-text">
      {/*
        Barra escura fixa (`.ink-scope`, ver `globals.css`) — pedido do
        usuário: adaptar o clima "canvas quente + barra escura" de uma
        referência de design trazida por ele, com os tokens que a Rotta
        já tem (nunca a cor/fonte/marca literal da referência). Sólida
        (sem blur) em vez do antigo `bg-background/85 backdrop-blur-md`:
        também tira do caminho o `backdrop-filter`, que é uma fonte
        conhecida de instabilidade no Safari/iOS.
      */}
      <header className="ink-scope sticky top-0 z-20">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2 text-lg font-bold tracking-tight">
            <RouteMark className="h-8 w-8" />
            Rotta
          </Link>
          <nav className="hidden items-center gap-8 md:flex">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-xs font-medium uppercase tracking-[0.06em] text-text-muted transition-colors hover:text-text"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="hidden items-center gap-3 md:flex">
            <ThemeToggle />
            <Link href="/entrar" className={pillGhostSm}>
              Entrar
            </Link>
            <Link href="/criar-conta" className={pillPrimarySm}>
              Criar conta
            </Link>
          </div>
          <div className="flex items-center gap-1 md:hidden">
            <ThemeToggle />
            <button
              type="button"
              aria-label={menuAberto ? "Fechar menu" : "Abrir menu"}
              aria-expanded={menuAberto}
              onClick={() => setMenuAberto((aberto) => !aberto)}
              className="flex h-10 w-10 items-center justify-center rounded-md text-text transition-colors hover:bg-muted"
            >
              {menuAberto ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/*
          BUG corrigido (usuário: "clicar duas vezes para ir em uma
          opção", Safari/iOS) — a causa real nunca foi só o aninhamento
          `<Link><Button></Link>` (já eliminado em todo o app): este
          menu ficava condicionalmente MONTADO só com `{menuAberto &&
          (...)}`, e cada `<Link>` de dentro tinha `onClick={() =>
          setMenuAberto(false)}` — ou seja, o próprio clique que deveria
          navegar também desmontava o `<a>` que acabou de ser tocado
          (o React remove o nó do DOM ao re-renderizar com
          `menuAberto = false`, no mesmo ciclo do evento de clique). O
          Safari no iPhone cancela a navegação-padrão de um `<a>` quando
          ele é removido da árvore antes do clique terminar de ser
          processado — o menu fechava, mas a navegação não acontecia;
          só no SEGUNDO toque (agora sem o menu no caminho) é que
          funcionava. Correção: o painel fica SEMPRE montado (nunca
          desmonta os links), só alterna a classe `hidden` — o mesmo nó
          `<a>` continua na árvore do início ao fim do clique, então o
          Safari completa a navegação normalmente.
        */}
        <nav
          className={`flex-col gap-1 border-t border-border px-6 py-4 md:hidden ${menuAberto ? "flex" : "hidden"}`}
        >
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuAberto(false)}
              className="rounded-md px-2 py-2.5 text-sm text-text-muted transition-colors hover:bg-muted hover:text-text"
            >
              {link.label}
            </Link>
          ))}
          <div className="mt-2 flex flex-col gap-2 border-t border-border pt-4">
            <Link
              href="/entrar"
              onClick={() => setMenuAberto(false)}
              className={`${pillGhostSm} w-full`}
            >
              Entrar
            </Link>
            <Link
              href="/criar-conta"
              onClick={() => setMenuAberto(false)}
              className={`${pillPrimarySm} w-full`}
            >
              Criar conta
            </Link>
          </div>
        </nav>
      </header>

      <main className="flex-1">{children}</main>

      {/* `.ink-scope` (ver header acima) — mesmo bloco escuro fixo do rodapé da referência de design, com os tokens da própria Rotta. */}
      <footer className="ink-scope w-full">
        <div className="mx-auto grid w-full max-w-6xl grid-cols-2 gap-8 px-6 py-12 sm:grid-cols-3 lg:grid-cols-6">
          <div className="col-span-2 flex flex-col gap-2 sm:col-span-3 lg:col-span-1">
            <span className="flex items-center gap-2 text-base font-bold tracking-tight">
              <RouteMark className="h-6 w-6" />
              Rotta
            </span>
            <p className="text-sm text-text-muted">
              Transporte escolar sob controle, do embarque à entrega.
            </p>
            <a
              href={ROTTA_INSTAGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Rotta no Instagram (abre em nova aba)"
              className="mt-1 flex h-8 w-8 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-muted hover:text-text"
            >
              <InstagramGlyph className="h-4 w-4" />
            </a>
          </div>
          {FOOTER_COLUNAS.map((coluna) => (
            <div key={coluna.titulo} className="flex flex-col gap-3">
              <span className="text-sm font-semibold">{coluna.titulo}</span>
              <nav className="flex flex-col gap-2">
                {coluna.links.map((link) => (
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
          ))}
        </div>
        <div className="border-t border-border px-6 py-6">
          <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-3 text-xs text-text-muted sm:flex-row">
            <p>
              © {new Date().getFullYear()} Rotta do Brasil Tecnologia e Soluções de Transportes —
              CNPJ 54.623.584/0001-80. Todos os direitos reservados.
            </p>
            <p>Brasil · Português</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

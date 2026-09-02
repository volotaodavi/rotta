"use client";

import { Menu, X } from "@rotta/icons";
import Link from "next/link";
import { useEffect, useState } from "react";

import type { Route } from "next";
import type { ReactNode } from "react";

import { LEGAL_FOOTER_LINKS } from "@/components/legal/legal-footer-links";
import { pillGhostSm, pillPrimarySm } from "@/components/pill-button-classes";
import { RouteWordmark } from "@/components/route-wordmark";


/**
 * Navegação principal — majoritariamente âncoras da própria Landing
 * Page (pedido do usuário 02/09/2026: "os links... devem levar
 * exatamente às seções correspondentes"). `/#id` funciona a partir de
 * qualquer rota do site (Next.js navega pra `/` e rola até a âncora),
 * não só da própria home. Exceção: "Planos" é página separada de
 * verdade (`/planos`, preço + 1º mês grátis) — precisa de URL própria
 * pra ser compartilhável e indexável sozinha, ao contrário de uma seção
 * dentro da Home.
 */
const NAV_LINKS: { href: Route; label: string }[] = [
  { href: "/#para-responsaveis", label: "Para responsáveis" },
  { href: "/#para-transportadores", label: "Para transportadores" },
  { href: "/#para-motoristas", label: "Para motoristas" },
  { href: "/#como-funciona", label: "Como funciona" },
  // Pedido do usuário 02/09/2026 ("otimize para que fique harmônico"):
  // `/planos` já existia (real, no `sitemap.ts`) mas não tinha link
  // nenhum na navegação — só alcançável digitando a URL direto.
  { href: "/planos", label: "Planos" },
  { href: "/#sobre", label: "Sobre a Rotta" },
];

/**
 * URL de destino do CTA principal "Começar agora" — configurável num
 * único lugar (pedido do usuário: "deixe uma constante... para que seja
 * facilmente substituída"). Já existe uma rota real de cadastro no
 * projeto (`/selecionar-perfil`, mesmo destino que o resto do site já
 * usa) — usada aqui em vez de um placeholder `"#"`, que só faria
 * sentido se nenhuma URL real existisse ainda.
 */
export const ROTTA_APP_URL: Route = "/selecionar-perfil";

const ROTTA_INSTAGRAM_URL = "https://www.instagram.com/rotta_app/";

/** Glifo do Instagram desenhado à mão (contorno genérico — não é o logotipo/marca registrada da Meta). */
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

/**
 * 8 links do rodapé pedidos pelo usuário — todos reais (nenhum
 * placeholder inventado): as 3 âncoras da própria página, "Empresa"/
 * "Suporte" apontando pras páginas institucionais reais que já existem
 * (`/sobre`, `/suporte`), "Privacidade"/"Termos" pro Legal Center real
 * (`LEGAL_FOOTER_LINKS`, mesma fonte usada no painel autenticado).
 */
const FOOTER_LINKS: { href: Route; label: string }[] = [
  { href: "/#como-funciona", label: "Produto" },
  { href: "/#para-responsaveis", label: "Para responsáveis" },
  { href: "/#para-transportadores", label: "Para transportadores" },
  { href: "/#para-motoristas", label: "Para motoristas" },
  { href: "/planos", label: "Planos" },
  { href: "/sobre", label: "Empresa" },
  { href: "/suporte", label: "Suporte" },
  {
    href: LEGAL_FOOTER_LINKS.find((link) => link.label === "Privacidade")!.href,
    label: "Privacidade",
  },
  {
    href: LEGAL_FOOTER_LINKS.find((link) => link.label === "Termos de Uso")!.href,
    label: "Termos",
  },
];

/**
 * Layout do route group `(marketing)` — reconstrução pedida pelo
 * usuário 02/09/2026 ("Crie/reconstrua a landing page oficial da
 * ROTTA"). Duas mudanças estruturais em relação à versão anterior:
 *
 * 1. Tema forçado CLARO (`data-theme="light"` no wrapper) — a marca da
 *    Rotta aqui é "branco como base", diferente do padrão escuro do
 *    resto da plataforma (Dossiê 10 §7.1). Os valores em si não são
 *    novos: são os MESMOS tokens `--color-*` que `packages/theme` já
 *    define pro tema claro (extraídos, nunca inventados) — só
 *    reaplicados sempre, independente da preferência do sistema. Sem
 *    `ThemeToggle` aqui: um botão de tema escuro não faz sentido numa
 *    página que é sempre clara por decisão de marca.
 * 2. Cabeçalho deixou de ser a barra escura fixa (`.ink-scope`) e virou
 *    branco, ficando translúcido/com blur e sombra só depois de rolar
 *    (pedido explícito do usuário). O rodapé CONTINUA escuro
 *    (`.ink-scope`) — é o "azul profundo institucional" pedido pelo
 *    usuário — e usa `RouteWordmark` na variante branca original.
 *
 * Revisão 02/09/2026 (pedido do usuário: "deixe a logo original, não um
 * ícone da logo + texto... cadê aquela logo completa, a que está igual
 * no rodapé?"): o cabeçalho usava um par ícone+texto (`RottaLogoLockup`,
 * removido) porque o wordmark completo original é quase branco puro —
 * literalmente invisível sobre o fundo branco do cabeçalho. Em vez de
 * inventar outra composição, `RouteWordmark` ganhou uma segunda
 * variante (`variant="dark"`, ver `route-wordmark.tsx`): o MESMO
 * arquivo/desenho, só com a parte "otta" recolorida pra `--color-text`
 * (o R + ponto azul em gradiente é idêntico ao do rodapé) — a mesma
 * logo completa em toda a página, cada uma na cor que funciona no seu
 * fundo.
 */
export default function MarketingLayout({ children }: { children: ReactNode }): JSX.Element {
  const [menuAberto, setMenuAberto] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function onScroll(): void {
      setScrolled(window.scrollY > 8);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div data-theme="light" className="flex min-h-screen flex-col bg-background text-text">
      <header
        className={`sticky top-0 z-30 transition-[background-color,box-shadow,border-color] duration-200 ${
          scrolled
            ? "border-b border-border bg-background/85 shadow-sm backdrop-blur-md"
            : "border-b border-transparent bg-background/0"
        }`}
      >
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-3.5">
          <Link href="/" className="flex items-center" aria-label="Página inicial da Rotta">
            <RouteWordmark variant="dark" className="h-7 w-auto" />
          </Link>

          <nav className="hidden items-center gap-7 lg:flex">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-text-muted transition-colors hover:text-text"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-3 lg:flex">
            <Link href="/entrar" className={pillGhostSm}>
              Entrar
            </Link>
            <Link href={ROTTA_APP_URL} className={pillPrimarySm}>
              Começar agora
            </Link>
          </div>

          <button
            type="button"
            aria-label={menuAberto ? "Fechar menu" : "Abrir menu"}
            aria-expanded={menuAberto}
            aria-controls="menu-mobile"
            onClick={() => setMenuAberto((aberto) => !aberto)}
            className="flex h-10 w-10 items-center justify-center rounded-md text-text transition-colors hover:bg-muted lg:hidden"
          >
            {menuAberto ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/*
          Painel sempre montado, só alterna `hidden` (mesmo cuidado já
          documentado no histórico deste layout: desmontar os `<Link>`
          no clique quebra a navegação no Safari/iOS — o nó precisa
          continuar na árvore até o clique terminar de ser processado).
        */}
        <nav
          id="menu-mobile"
          className={`flex-col gap-1 border-t border-border bg-background px-6 py-4 lg:hidden ${
            menuAberto ? "flex" : "hidden"
          }`}
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
              href={ROTTA_APP_URL}
              onClick={() => setMenuAberto(false)}
              className={`${pillPrimarySm} w-full`}
            >
              Começar agora
            </Link>
          </div>
        </nav>
      </header>

      <main className="flex-1">{children}</main>

      {/* Rodapé — permanece escuro (`.ink-scope`): o "azul profundo institucional" pedido pelo usuário. */}
      <footer className="ink-scope w-full">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-14">
          <div className="flex flex-col gap-3">
            <RouteWordmark className="h-6 w-auto self-start" />
            <p className="max-w-sm text-sm text-text-muted">
              Tecnologia para o transporte escolar: conectamos responsáveis, motoristas, monitores e
              transportadoras numa única plataforma.
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

          <nav className="flex flex-wrap gap-x-8 gap-y-3 border-t border-border pt-8">
            {FOOTER_LINKS.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="text-sm text-text-muted transition-colors hover:text-text"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="border-t border-border px-6 py-6">
          <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-3 text-xs text-text-muted sm:flex-row">
            <p>
              © {new Date().getFullYear()} Rotta do Brasil Tecnologia e Soluções de Transportes,
              CNPJ 54.623.584/0001-80. Todos os direitos reservados.
            </p>
            <p>Brasil · Português</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

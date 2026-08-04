"use client";

import { Menu, X } from "@rotta/icons";
import { Button } from "@rotta/ui/web";
import Link from "next/link";
import { useState } from "react";

import type { Route } from "next";
import type { ReactNode } from "react";

import { RouteMark } from "@/components/route-mark";

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

const FOOTER_COLUNAS: FooterColumn[] = [
  {
    titulo: "Produto",
    links: [
      { href: "/planos", label: "Planos" },
      { href: "/beneficios", label: "Benefícios" },
      { href: "/blog", label: "Blog" },
    ],
  },
  {
    titulo: "Conta",
    links: [
      { href: "/entrar", label: "Entrar" },
      { href: "/criar-conta/pessoal", label: "Sou responsável" },
      { href: "/criar-conta/empresa", label: "Sou transportadora" },
      { href: "/criar-conta/profissional", label: "Sou motorista/monitor" },
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
];

/**
 * Layout do route group `(marketing)` — Landing Page + Site público
 * (Dossie 11, Secao 1; briefing "ROTTA DIGITAL EXPERIENCE"). Header
 * fixo (sticky + blur) com marca (ver `RouteMark`) e rodapé em colunas
 * — estrutura inspirada nos rodapés/cabeçalhos de Uber e 99, sem
 * reaproveitar cor ou copy das referências. Abaixo de `md`, a navegação
 * migra para um menu de disclosure (antes desaparecia sem substituto).
 */
export default function MarketingLayout({ children }: { children: ReactNode }): JSX.Element {
  const [menuAberto, setMenuAberto] = useState(false);

  return (
    <div className="flex min-h-screen flex-col bg-background text-text">
      <header className="sticky top-0 z-20 border-b border-border bg-background">
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
                className="text-sm text-text-muted transition-colors hover:text-text"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="hidden items-center gap-3 md:flex">
            <Link href="/entrar">
              <Button variant="ghost" size="sm">
                Entrar
              </Button>
            </Link>
            <Link href="/criar-conta">
              <Button variant="primary" size="sm">
                Criar conta
              </Button>
            </Link>
          </div>
          <button
            type="button"
            aria-label={menuAberto ? "Fechar menu" : "Abrir menu"}
            aria-expanded={menuAberto}
            onClick={() => setMenuAberto((aberto) => !aberto)}
            className="flex h-10 w-10 items-center justify-center rounded-md text-text transition-colors hover:bg-muted md:hidden"
          >
            {menuAberto ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {menuAberto && (
          <nav className="flex flex-col gap-1 border-t border-border px-6 py-4 md:hidden">
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
              <Link href="/entrar" onClick={() => setMenuAberto(false)}>
                <Button variant="ghost" size="sm" fullWidth>
                  Entrar
                </Button>
              </Link>
              <Link href="/criar-conta" onClick={() => setMenuAberto(false)}>
                <Button variant="primary" size="sm" fullWidth>
                  Criar conta
                </Button>
              </Link>
            </div>
          </nav>
        )}
      </header>

      <main className="flex-1">{children}</main>

      <footer className="w-full border-t border-border">
        <div className="mx-auto grid w-full max-w-6xl grid-cols-2 gap-8 px-6 py-12 sm:grid-cols-4">
          <div className="col-span-2 flex flex-col gap-2 sm:col-span-1">
            <span className="flex items-center gap-2 text-base font-bold tracking-tight">
              <RouteMark className="h-6 w-6" />
              Rotta
            </span>
            <p className="text-sm text-text-muted">
              Transporte escolar sob controle, do embarque à entrega.
            </p>
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
          <p className="mx-auto w-full max-w-6xl text-center text-xs text-text-muted">
            © {new Date().getFullYear()} Rotta. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}

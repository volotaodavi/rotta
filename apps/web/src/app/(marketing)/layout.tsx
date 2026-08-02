import { Button } from "@rotta/ui/web";
import Link from "next/link";

import type { Route } from "next";
import type { ReactNode } from "react";

const NAV_LINKS: { href: Route; label: string }[] = [
  { href: "/planos", label: "Planos" },
  { href: "/beneficios", label: "Benefícios" },
  { href: "/faq", label: "FAQ" },
  { href: "/contato", label: "Contato" },
  { href: "/suporte", label: "Suporte" },
];

const FOOTER_LINKS: { href: Route; label: string }[] = [
  ...NAV_LINKS,
  { href: "/blog", label: "Blog" },
];

/**
 * Layout do route group `(marketing)` — Landing Page + Site público
 * (Dossie 11, Secao 1). Header/footer minimalistas, inspirados em
 * Uber/Stripe/Notion/Linear (briefing): muito espaço em branco, poucos
 * elementos de navegação.
 */
export default function MarketingLayout({ children }: { children: ReactNode }): JSX.Element {
  return (
    <div className="flex min-h-screen flex-col bg-background text-text">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <Link href="/" className="text-lg font-bold tracking-tight">
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
        <div className="flex items-center gap-3">
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
      </header>

      <main className="flex-1">{children}</main>

      <footer className="mx-auto w-full max-w-6xl px-6 py-10">
        <div className="flex flex-col items-center gap-4 border-t border-border pt-8 text-center">
          <nav className="flex flex-wrap items-center justify-center gap-6">
            {FOOTER_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm text-text-muted transition-colors hover:text-text"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <p className="text-xs text-text-muted">© {new Date().getFullYear()} Rotta.</p>
        </div>
      </footer>
    </div>
  );
}

"use client";

import { Menu, X } from "@rotta/icons";
import { Typography } from "@rotta/ui/web";
import Link from "next/link";
import { useState, type ReactNode } from "react";

import { LegalFooter } from "@/components/legal/legal-footer";
import { LegalSearch } from "@/components/legal/legal-search";
import { LegalSidebar } from "@/components/legal/legal-sidebar";
import { RouteMark } from "@/components/route-mark";
import { ThemeToggle } from "@/components/theme-toggle";

/**
 * Casco da Documentação Rotta (Dossiê 45, prompt §3/§32) — pública, sem
 * login, disponível tanto para um visitante do site quanto para a
 * WebView embutida no aplicativo (Dossiê 45 §mobile: a mesma página web
 * é reaproveitada, nunca duplicada em React Native). Header próprio
 * (não o header de marketing com "Entrar"/"Criar conta" — confuso
 * dentro de uma WebView de quem já está logado no app) + navegação
 * lateral fixa no desktop, "Documentação Rotta" expansível no mobile
 * (prompt §3).
 */
export default function LegalLayout({ children }: { children: ReactNode }): JSX.Element {
  const [menuAberto, setMenuAberto] = useState(false);

  return (
    <div className="flex min-h-screen flex-col bg-background text-text">
      <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2 text-base font-bold tracking-tight">
            <RouteMark className="h-7 w-7" />
            Rotta
          </Link>
          <Typography variant="overline" color="muted" className="hidden sm:block">
            Documentação Rotta
          </Typography>
          <ThemeToggle />
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-6 py-8 lg:flex-row lg:gap-12">
        {/* Desktop: coluna fixa lateral (prompt §3, "Desktop"). */}
        <aside className="hidden w-64 shrink-0 flex-col gap-6 lg:flex">
          <LegalSearch />
          <div>
            <Typography variant="overline" color="muted" className="mb-2 block px-3">
              Documentação Rotta
            </Typography>
            <LegalSidebar />
          </div>
        </aside>

        {/* Mobile/tablet: "Documentação Rotta" com menu expansível (prompt §3, "No mobile"). */}
        <div className="flex flex-col gap-4 lg:hidden">
          <LegalSearch />
          <button
            type="button"
            onClick={() => setMenuAberto((aberto) => !aberto)}
            aria-expanded={menuAberto}
            className="flex items-center justify-between rounded-md border border-border px-4 py-3 text-sm font-semibold"
          >
            Documentação Rotta
            {menuAberto ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
          {/*
            BUG corrigido (usuário: "clicar duas vezes para ir em uma
            opção", Safari/iOS) — mesma causa do menu mobile de
            `(marketing)/layout.tsx`: este painel só existia no DOM
            enquanto `menuAberto` era `true`, e cada link dentro dele
            fechava o menu (`onNavigate`) no MESMO clique que deveria
            navegar — o React desmontava o `<a>` tocado antes do Safari
            terminar de processar a navegação padrão, cancelando-a.
            Correção: fica sempre montado, só alterna `hidden`.
          */}
          <div className={`rounded-md border border-border p-2 ${menuAberto ? "" : "hidden"}`}>
            <LegalSidebar onNavigate={() => setMenuAberto(false)} />
          </div>
        </div>

        <main className="flex-1">{children}</main>
      </div>

      <LegalFooter />
    </div>
  );
}

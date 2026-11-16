import Link from "next/link";

import type { Metadata } from "next";
import type { ReactNode } from "react";

import { RouteMark } from "@/components/route-mark";
import { MarketingTracking } from "@/features/marketing/components/marketing-tracking";
import { getGoogleAdsId, getMetaPixelId } from "@/lib/site-config";

/**
 * Todas as páginas de `(auth)` são "use client" (formulários
 * interativos), então nenhuma delas pode exportar `metadata` própria
 * (Dossiê 12 §7.4 — só Server Components exportam metadata). Este
 * layout É um Server Component, então a metadata daqui é herdada por
 * toda a árvore — cobertura genérica melhor que nenhuma. Nunca inclui
 * `alternates.canonical` aqui de propósito: um canonical fixo neste
 * nível apontaria a MESMA URL para `/entrar`, `/criar-conta`,
 * `/convite` etc., o que é errado (cada uma é uma página distinta).
 */
export const metadata: Metadata = {
  title: "Entrar ou criar conta",
  description:
    "Acesse sua conta Rotta ou crie uma nova: responsável, transportadora, motorista ou monitor. Mesmo login no site, no painel Web e no aplicativo.",
};

/**
 * Layout do route group `(auth)` — login, criar conta e recuperação de
 * senha (Dossiê 15). Sem largura máxima própria (Dossiê 23, Secao 4.1)
 * — telas curtas (login, seletor "Área Profissional/Pessoal") se
 * limitam via `mx-auto max-w-sm` na própria página; o formulário de
 * cadastro de Empresa precisa de mais espaço (`max-w-2xl`) e
 * controla sua própria largura. A marca (`RouteMark`) fica centralizada
 * no topo, único elemento comum a todas as telas deste grupo.
 */
export default function AuthLayout({ children }: { children: ReactNode }): JSX.Element {
  return (
    <div className="flex min-h-screen flex-col items-center bg-background px-4 py-10">
      {/*
        `<header>` em volta do logotipo pela mesma razão do `<main>`
        abaixo: era o único elemento das 7 telas que ficava fora de
        qualquer região, e quem navega por marcos não tinha como
        alcançá-lo. Não muda nada no visual (as classes continuam no
        `<Link>`), nem a ordem do Tab.
      */}
      <header className="mb-8">
        <Link href="/">
          <RouteMark className="h-10 w-10" />
        </Link>
      </header>
      <MarketingTracking metaPixelId={getMetaPixelId()} googleAdsId={getGoogleAdsId()} />
      {/*
        `<main>` em volta do formulário, nunca em volta do logotipo: o
        logotipo é um atalho para a home, não o conteúdo da tela. Sem
        esta marcação as 7 telas de `(auth)` não tinham região nenhuma,
        e quem navega por marcos saltava direto para o rodapé
        inexistente. A11Y-07, `docs/53`.

        `w-full` porque cada página controla a própria largura
        (`max-w-sm`, ou `max-w-2xl` no cadastro de Empresa) — sem isso o
        `<main>` encolheria para o conteúdo e quebraria esses limites.
      */}
      <main className="flex w-full flex-col items-center">{children}</main>
    </div>
  );
}

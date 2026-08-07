import Link from "next/link";


import type { Metadata } from "next";
import type { ReactNode } from "react";

import { RouteMark } from "@/components/route-mark";

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
    "Acesse sua conta Rotta ou crie uma nova — responsável, transportadora, motorista ou monitor. Mesmo login no site, no painel Web e no aplicativo.",
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
      <Link href="/" className="mb-8">
        <RouteMark className="h-10 w-10" />
      </Link>
      {children}
    </div>
  );
}

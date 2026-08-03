import Link from "next/link";

import type { ReactNode } from "react";

import { RouteMark } from "@/components/route-mark";


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

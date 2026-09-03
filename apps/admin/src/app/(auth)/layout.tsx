"use client";

import { useEffect } from "react";

import type { ReactNode } from "react";

import { wakeApi } from "@/lib/wake-api";


/**
 * Layout de autenticacao do Admin Rotta — e-mail/senha + 2FA obrigatorio
 * (Dossie 12, Secao 4.5), nunca OTP/magic link (perfil de acesso
 * cross-tenant, Dossie 9 Secao 2.5). Nenhuma tela real implementada
 * ainda (fase de fundacao).
 *
 * "use client" (era Server Component) só pra poder chamar `wakeApi()`
 * assim que a tela de login monta — ver `wakeApi` pro raciocínio
 * completo (mitigar o cold-start do Render, pedido do usuário
 * 03/09/2026). Nenhuma outra mudança de comportamento.
 */
export default function AdminAuthLayout({ children }: { children: ReactNode }): JSX.Element {
  useEffect(() => {
    wakeApi();
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}

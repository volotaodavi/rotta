import type { ReactNode } from "react";

/**
 * Layout de autenticacao do Admin Rotta — e-mail/senha + 2FA obrigatorio
 * (Dossie 12, Secao 4.5), nunca OTP/magic link (perfil de acesso
 * cross-tenant, Dossie 9 Secao 2.5). Nenhuma tela real implementada
 * ainda (fase de fundacao).
 */
export default function AdminAuthLayout({ children }: { children: ReactNode }): JSX.Element {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}

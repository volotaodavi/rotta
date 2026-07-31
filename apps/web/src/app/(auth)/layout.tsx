import type { ReactNode } from "react";

/**
 * Layout do route group `(auth)` — telas de login, cadastro e
 * recuperacao de senha (Dossie 15) — layout centralizado, sem
 * navegacao (Dossie 23, Secao 4.1). Nenhuma tela real implementada
 * ainda (fase de fundacao).
 */
export default function AuthLayout({ children }: { children: ReactNode }): JSX.Element {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}

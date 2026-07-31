import type { ReactNode } from "react";

/**
 * Layout do painel administrativo interno (Dossie 11, Secao 6) —
 * clientes/tenants, suporte, financeiro, logs, metricas.
 *
 * TODO (quando o modulo Auth real existir): validar sessao + papel
 * `admin_rotta` aqui, com o mesmo principio estrutural do
 * `(dashboard)/layout.tsx` de apps/web (Dossie 23, Secao 4.1) — nenhuma
 * logica de sessao implementada ainda (fase de fundacao).
 */
export default function AdminLayout({ children }: { children: ReactNode }): JSX.Element {
  return (
    <div className="flex min-h-screen bg-background text-text">
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}

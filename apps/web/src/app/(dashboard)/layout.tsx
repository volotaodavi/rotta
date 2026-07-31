import type { ReactNode } from "react";

/**
 * Layout do route group `(dashboard)` — Painel Administrativo autenticado
 * (Empresa, Gestor, Escola — Dossie 11, Secao 2/5), com o AppShell
 * (sidebar + cabecalho, Dossie 10 Secao 11.2).
 *
 * TODO (quando o modulo Auth real existir, Dossie 15): toda rota sob este
 * grupo deve validar a sessao aqui — nenhuma tela individual reimplementa
 * a checagem de autenticacao, ela e garantida estruturalmente por estar
 * dentro deste layout (Dossie 23, Secao 4.1). Nenhuma logica de sessao
 * foi implementada ainda (fase de fundacao) — este layout apenas fixa a
 * estrutura de rota.
 */
export default function DashboardLayout({ children }: { children: ReactNode }): JSX.Element {
  return (
    <div className="flex min-h-screen bg-background text-text">
      {/* Sidebar real (Dossie 10, Secao 11.2) entra aqui quando @rotta/ui tiver o componente */}
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}

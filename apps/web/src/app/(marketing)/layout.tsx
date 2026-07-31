import type { ReactNode } from "react";

/**
 * Layout do route group `(marketing)` — Landing Page publica (Dossie 11,
 * Secao 1), sem sidebar/navegacao autenticada (Dossie 23, Secao 4.1).
 * O cabecalho/rodape reais da Landing (Dossie 11, Secao 1.1) serao
 * compostos aqui a partir de `@rotta/ui` quando os componentes existirem.
 */
export default function MarketingLayout({ children }: { children: ReactNode }): JSX.Element {
  return <div className="min-h-screen bg-background text-text">{children}</div>;
}

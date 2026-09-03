import type { Metadata } from "next";
import type { ReactNode } from "react";

import { AppProviders } from "@/providers/app-providers";

import "./globals.css";

export const metadata: Metadata = {
  title: "Rotta Admin",
  description: "Painel interno da equipe Rotta.",
};

/**
 * Script bloqueante (roda antes do primeiro paint, antes da hidratação
 * do React) que resolve e aplica `data-theme` na raiz do documento —
 * mesmo mecanismo de `apps/web/src/app/layout.tsx` (ver a nota lá para
 * o porquê de `<html>` abaixo NÃO declarar `data-theme` no JSX, e para
 * o porquê de precisar de `suppressHydrationWarning` — mesmo bug,
 * replicado aqui e corrigido na auditoria de 03/09/2026: sem ele, o
 * React comparava o HTML do servidor (sem `data-theme`) com o DOM já
 * modificado por este script e logava "hidratação divergente" como
 * ERRO em toda navegação/reload do Admin).
 */
const THEME_INIT_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem("rotta-theme");
    var theme =
      stored === "light" || stored === "dark"
        ? stored
        : window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches
          ? "light"
          : "dark";
    document.documentElement.setAttribute("data-theme", theme);
  } catch (e) {
    document.documentElement.setAttribute("data-theme", "dark");
  }
})();
`;

/**
 * Layout raiz do Admin Rotta — deploy isolado do apps/web por motivo de
 * seguranca (Dossie 22, Secao 4.3): modelo de autorizacao cross-tenant
 * distinto, nunca deve compartilhar processo/rota com o painel de cliente.
 */
export default function RootLayout({ children }: { children: ReactNode }): JSX.Element {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}

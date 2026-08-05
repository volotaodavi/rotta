import type { Metadata } from "next";
import type { ReactNode } from "react";

import { AppProviders } from "@/providers/app-providers";
import { ServiceWorkerRegistration } from "@/providers/service-worker-registration";

import "./globals.css";

export const metadata: Metadata = {
  title: "Rotta",
  description: "Gestão inteligente para transporte escolar.",
};

/**
 * Script bloqueante (roda antes do primeiro paint, antes da hidratação
 * do React) que resolve e aplica `data-theme` na raiz do documento —
 * evita o "flash" de tema errado que aconteceria se essa decisão só
 * fosse tomada depois que o React montasse (`ThemeProvider`). Ordem de
 * resolução: escolha explícita salva (`localStorage`) → preferência do
 * sistema operacional (`prefers-color-scheme`) → escuro (padrão de
 * fábrica, Dossiê 10 Secao 7.1). Note que `<html>` abaixo NÃO declara
 * `data-theme` no JSX — se declarasse, a hidratação do React
 * reconciliaria o atributo de volta para o valor literal do servidor,
 * desfazendo exatamente o que este script acabou de aplicar.
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
 * Layout raiz — envolve toda a aplicacao (Landing, Auth e Painel) com os
 * providers de nivel de aplicacao (Dossie 23, Secao 1.1). Nenhum
 * conteudo de tela real vive aqui; cada route group (`(marketing)`,
 * `(auth)`, `(dashboard)`) tem seu proprio layout mais especifico.
 */
export default function RootLayout({ children }: { children: ReactNode }): JSX.Element {
  return (
    <html lang="pt-BR">
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>
        <ServiceWorkerRegistration />
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}

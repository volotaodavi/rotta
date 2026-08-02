
import type { Metadata } from "next";
import type { ReactNode } from "react";

import { AppProviders } from "@/providers/app-providers";

import "./globals.css";

export const metadata: Metadata = {
  title: "Rotta — Admin",
  description: "Painel interno da equipe Rotta.",
};

/**
 * Layout raiz do Admin Rotta — deploy isolado do apps/web por motivo de
 * seguranca (Dossie 22, Secao 4.3): modelo de autorizacao cross-tenant
 * distinto, nunca deve compartilhar processo/rota com o painel de cliente.
 */
export default function RootLayout({ children }: { children: ReactNode }): JSX.Element {
  return (
    <html lang="pt-BR" data-theme="dark">
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}

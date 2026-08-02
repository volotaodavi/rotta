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
 * Layout raiz — envolve toda a aplicacao (Landing, Auth e Painel) com os
 * providers de nivel de aplicacao (Dossie 23, Secao 1.1). Nenhum
 * conteudo de tela real vive aqui; cada route group (`(marketing)`,
 * `(auth)`, `(dashboard)`) tem seu proprio layout mais especifico.
 */
export default function RootLayout({ children }: { children: ReactNode }): JSX.Element {
  return (
    <html lang="pt-BR" data-theme="dark">
      <body>
        <ServiceWorkerRegistration />
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}

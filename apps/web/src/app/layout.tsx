import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import {
  SITE_DESCRIPTION,
  SITE_INSTAGRAM_URL,
  SITE_LOGO_PATH,
  SITE_NAME,
  getGoogleSiteVerification,
  getSiteUrl,
} from "@/lib/site-config";
import { AppProviders } from "@/providers/app-providers";
import { InstallAppPrompt } from "@/providers/install-app-prompt";
import { ServiceWorkerRegistration } from "@/providers/service-worker-registration";

import "./globals.css";

/**
 * Metadados globais (Dossiê 12 §7.4 — indexação gratuita no Google).
 * `metadataBase` resolve todo `openGraph.images`/`canonical` relativo
 * das páginas filhas para uma URL absoluta usando o domínio real do
 * deployment (`getSiteUrl()`, nunca hardcoded — ver `site-config.ts`).
 * `title.template` prefixa o título de cada página filha com "· Rotta"
 * automaticamente — nenhuma página precisa repetir o nome da marca.
 */
export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: `${SITE_NAME} — Transporte escolar rastreado em tempo real`,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: SITE_NAME,
    title: `${SITE_NAME} — Transporte escolar rastreado em tempo real`,
    description: SITE_DESCRIPTION,
    images: [{ url: SITE_LOGO_PATH }],
  },
  twitter: {
    card: "summary",
    title: `${SITE_NAME} — Transporte escolar rastreado em tempo real`,
    description: SITE_DESCRIPTION,
    images: [SITE_LOGO_PATH],
  },
  robots: {
    index: true,
    follow: true,
  },
  verification: {
    google: getGoogleSiteVerification(),
  },
  // iOS/Safari não lê `manifest.webmanifest` (Android/Chrome) pra decidir
  // como abrir o app instalado — usa suas próprias meta tags. Sem isso,
  // "Compartilhar → Adicionar à Tela de Início" (o único caminho de
  // instalação no iPhone hoje — nenhum botão nosso dispara isso, Apple
  // não expõe essa API pra páginas web) ainda funcionava, mas abria
  // dentro do navegador (barra de endereço visível) em vez de tela
  // cheia, e com um ícone genérico (screenshot da página) em vez do
  // logo da Rotta. Resultado agora é o mesmo de instalar via Chrome:
  // ícone certo, sem barra de navegador, nome "Rotta" embaixo do ícone.
  appleWebApp: {
    capable: true,
    title: SITE_NAME,
    statusBarStyle: "black-translucent",
  },
  icons: {
    apple: "/brand/rotta-mark-192.png",
  },
};

/** `theme-color` (cor da barra do navegador) — campo próprio do Next.js 15 (`generateViewport`/`viewport`), separado de `Metadata` desde a v14. Mesma cor de fundo do manifest Android (`manifest.ts#theme_color`), só que também lida pelo Safari normal (não só pelo app instalado). */
export const viewport: Viewport = {
  themeColor: "#0B0F14",
};

/**
 * Dados estruturados JSON-LD (schema.org Organization) — ajuda o
 * Google a entender "quem é a Rotta" fora do texto visível da página
 * (pode alimentar o painel de conhecimento e a exibição da marca nos
 * resultados de busca). `sameAs` só lista o Instagram porque é a única
 * rede social real da Rotta hoje — nenhum perfil fabricado.
 */
function OrganizationJsonLd(): JSX.Element {
  const siteUrl = getSiteUrl();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Rotta do Brasil Tecnologia e Soluções de Transportes",
    alternateName: SITE_NAME,
    url: siteUrl,
    logo: `${siteUrl}${SITE_LOGO_PATH}`,
    description: SITE_DESCRIPTION,
    sameAs: [SITE_INSTAGRAM_URL],
  };
  return (
    // eslint-disable-next-line react/no-danger -- JSON-LD estático, nenhuma entrada de usuário envolvida.
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

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
 *
 * BUG corrigido: faltava `suppressHydrationWarning` no `<html>` — sem
 * ele, o React comparava o HTML gerado pelo servidor (sem
 * `data-theme`) com o DOM já modificado por este script (com
 * `data-theme`) e logava "hidratação divergente" como ERRO em TODA
 * navegação/reload da Landing Page (o badge vermelho "1 Issue" do dev
 * overlay que aparecia nos prints). O mismatch em si sempre foi
 * intencional (é o ponto do script), só faltava avisar o React pra não
 * tratar como erro.
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
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <OrganizationJsonLd />
      </head>
      <body>
        <ServiceWorkerRegistration />
        <AppProviders>{children}</AppProviders>
        <InstallAppPrompt />
      </body>
    </html>
  );
}

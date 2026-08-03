import type { MetadataRoute } from "next";

/**
 * Web App Manifest (briefing "PWA": "preparar o painel Web para
 * funcionar também como Progressive Web App"). Next.js 15 gera
 * `/manifest.webmanifest` automaticamente a partir deste arquivo.
 *
 * `icons` aponta para o logotipo real (`public/brand/rotta-mark-*.png`,
 * recortado do arquivo enviado pelo usuário) — com eles o navegador já
 * mostra o prompt "Adicionar à tela inicial" com o ícone correto.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Rotta",
    short_name: "Rotta",
    description: "Gestão inteligente para transporte escolar.",
    start_url: "/",
    display: "standalone",
    background_color: "#0B0F14",
    theme_color: "#0B0F14",
    icons: [
      { src: "/brand/rotta-mark-192.png", sizes: "192x192", type: "image/png" },
      { src: "/brand/rotta-mark-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}

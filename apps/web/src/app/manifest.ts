import type { MetadataRoute } from "next";

/**
 * Web App Manifest (briefing "PWA": "preparar o painel Web para
 * funcionar também como Progressive Web App"). Next.js 15 gera
 * `/manifest.webmanifest` automaticamente a partir deste arquivo.
 *
 * `icons` fica vazio deliberadamente — nenhum ícone de app (192x192/
 * 512x512) foi desenhado ainda (fora do escopo de design deste módulo);
 * sem eles o navegador não mostra o prompt "Adicionar à tela inicial",
 * mas o manifest/SW já preparam o resto da instalabilidade.
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
    icons: [],
  };
}

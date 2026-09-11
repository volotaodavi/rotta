import type { MetadataRoute } from "next";

/**
 * Web App Manifest (briefing "PWA": "preparar o painel Web para
 * funcionar também como Progressive Web App"). Next.js 15 gera
 * `/manifest.webmanifest` automaticamente a partir deste arquivo.
 *
 * `icons` aponta para o logotipo real (`public/brand/rotta-mark-*.png`,
 * recortado do arquivo enviado pelo usuário) — com eles o navegador já
 * mostra o prompt "Adicionar à tela inicial" com o ícone correto.
 *
 * `start_url` (pedido do usuário, 11/09/2026 — "quero a tela de login,
 * com tudo integrado... não quero a landing page no app"): quando o
 * app é aberto pelo ícone instalado (Android "Adicionar à tela
 * inicial"/iOS "Adicionar à Tela de Início" — nenhum dos dois passa
 * por loja), o navegador abre direto em `/entrar`, nunca na landing
 * page de marketing. `/entrar` já redireciona sozinho pra tela certa
 * do papel se a sessão continuar válida (`(auth)/entrar/page.tsx`) —
 * então reabrir o app já logado pula a tela de login e cai direto no
 * painel, igual o app nativo faz. Visitas normais pelo navegador
 * (barra de endereço, busca) continuam abrindo a landing normalmente
 * em `/` — só o `start_url` do app instalado muda.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Rotta — Gestão de Transporte Escolar",
    short_name: "Rotta",
    description: "Gestão inteligente para transporte escolar.",
    start_url: "/entrar",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0B0F14",
    theme_color: "#0B0F14",
    icons: [
      { src: "/brand/rotta-mark-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/brand/rotta-mark-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}

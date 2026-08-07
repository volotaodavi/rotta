import type { MetadataRoute } from "next";

import { getSiteUrl } from "@/lib/site-config";


/**
 * `sitemap.xml` gerado nativamente pelo Next.js 15 a partir deste
 * arquivo (Dossiê 12 §7.4 — indexação gratuita no Google: nenhuma
 * ferramenta paga envolvida, é um recurso built-in do framework).
 *
 * Só entram aqui páginas públicas com conteúdo real e que fazem
 * sentido aparecer numa busca:
 * - Landing + páginas institucionais (`(marketing)`).
 * - Telas de entrada do fluxo de conta (`/entrar`, `/criar-conta*`) —
 *   são "use client" mas continuam páginas públicas de verdade, só não
 *   têm `metadata` própria (ver `(auth)/layout.tsx`).
 *
 * Deliberadamente FORA do sitemap:
 * - `/blog` — `noindex` (página vazia, "estrutura preparada", ver
 *   `blog/page.tsx`); volta pro sitemap quando tiver conteúdo real.
 * - `/convite` e `/convite/[codigo]` — convite é um link privado
 *   endereçado a uma pessoa específica, não uma página de descoberta.
 * - Tudo em `(dashboard)` — exige login, sem valor de busca nenhum
 *   (ver `robots.ts`, que também bloqueia o rastreamento dessas rotas).
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl();
  const now = new Date();

  const paginas: {
    path: string;
    priority: number;
    changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  }[] = [
    { path: "/", priority: 1, changeFrequency: "weekly" },
    { path: "/planos", priority: 0.8, changeFrequency: "monthly" },
    { path: "/beneficios", priority: 0.7, changeFrequency: "monthly" },
    { path: "/faq", priority: 0.6, changeFrequency: "monthly" },
    { path: "/contato", priority: 0.4, changeFrequency: "yearly" },
    { path: "/suporte", priority: 0.4, changeFrequency: "yearly" },
    { path: "/entrar", priority: 0.5, changeFrequency: "yearly" },
    { path: "/criar-conta", priority: 0.7, changeFrequency: "monthly" },
    { path: "/criar-conta/pessoal", priority: 0.6, changeFrequency: "monthly" },
    { path: "/criar-conta/empresa", priority: 0.6, changeFrequency: "monthly" },
    { path: "/criar-conta/motorista", priority: 0.6, changeFrequency: "monthly" },
    { path: "/criar-conta/profissional", priority: 0.5, changeFrequency: "monthly" },
  ];

  return paginas.map(({ path, priority, changeFrequency }) => ({
    url: `${siteUrl}${path}`,
    lastModified: now,
    changeFrequency,
    priority,
  }));
}

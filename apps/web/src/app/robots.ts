import type { MetadataRoute } from "next";

import { getSiteUrl } from "@/lib/site-config";

/**
 * `robots.txt` gerado nativamente pelo Next.js 15 a partir deste
 * arquivo (Dossiê 12 §7.4). Bloqueia rastreamento de tudo que exige
 * login (`(dashboard)`, sem valor de busca e sem conteúdo real pra um
 * crawler sem sessão) e de convites (link privado endereçado a uma
 * pessoa específica — nunca uma página de descoberta). O resto do site
 * é público de propósito e deve ser rastreável.
 */
export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/empresa", "/veiculos", "/escolas", "/marketplace", "/notificacoes", "/convite"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}

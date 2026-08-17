import type { MetadataRoute } from "next";

/**
 * `robots.txt` do Portal Admin Rotta — gerado nativamente pelo Next.js
 * 15 a partir deste arquivo (mesmo mecanismo de `apps/web/src/app/
 * robots.ts`, Dossiê 12 §7.4). Diferente do Painel Web, aqui NÃO existe
 * conteúdo público: toda rota exige sessão de Admin Rotta (Dossiê 22
 * §4.3, deploy isolado por decisão de segurança) — bloqueia todo
 * rastreamento, sem exceção, e sem `sitemap` (não há página pública pra
 * listar). Faltava este arquivo antes desta entrega — sem ele, o
 * Next.js não gera `/robots.txt` nenhum e o comportamento padrão de
 * qualquer crawler é tentar indexar tudo.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      disallow: "/",
    },
  };
}

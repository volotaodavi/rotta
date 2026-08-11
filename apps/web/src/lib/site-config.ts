/**
 * Config compartilhada de SEO/metadados (Dossiê 12 §7.4 — indexação
 * gratuita no Google: Search Console, sitemap.xml, robots.txt,
 * meta description/OpenGraph por página).
 *
 * `getSiteUrl()` NUNCA fixa o domínio de produção como string literal —
 * a Vercel injeta `VERCEL_PROJECT_PRODUCTION_URL` automaticamente em
 * todo build (o domínio de produção estável do projeto, sem `https://`)
 * e `VERCEL_URL` (a URL do deployment atual). Resolver o domínio a
 * partir dessas variáveis, em vez de hardcodar `algo.vercel.app` ou um
 * domínio próprio ainda não comprado, significa que `metadataBase`,
 * `sitemap.xml`, `robots.txt` e o `canonical` de cada página continuam
 * corretos automaticamente no dia em que a Rotta configurar um domínio
 * próprio na Vercel — sem precisar tocar neste arquivo de novo.
 * `NEXT_PUBLIC_SITE_URL` existe como escape hatch manual (ex.: rodar
 * `next build` localmente fora da Vercel) e sempre vence se definida.
 */
export function getSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) {
    return explicit.replace(/\/+$/, "");
  }

  const productionDomain = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (productionDomain) {
    return `https://${productionDomain}`;
  }

  const deploymentDomain = process.env.VERCEL_URL;
  if (deploymentDomain) {
    return `https://${deploymentDomain}`;
  }

  return "http://localhost:3000";
}

export const SITE_NAME = "Rotta";

export const SITE_DESCRIPTION =
  "A Rotta conecta responsáveis, transportadoras, motoristas e monitores em um único lugar: rastreamento do transporte escolar em tempo real, notificação de embarque e desembarque, e gestão completa da frota — tudo em uma conta só.";

/** Logotipo real da marca (Dossiê 24) — usado como `logo` no JSON-LD Organization e como imagem de fallback do OpenGraph. */
export const SITE_LOGO_PATH = "/brand/rotta-mark-512.png";

export const SITE_INSTAGRAM_URL = "https://www.instagram.com/rotta_app/";

/**
 * Token de verificação de propriedade do Google Search Console (método
 * "tag HTML" — https://search.google.com/search-console, "Adicionar
 * propriedade" → tipo "Prefixo do URL" → aba "Tag HTML"). Opcional de
 * propósito: fica `undefined` até alguém colar o token real na env var
 * `GOOGLE_SITE_VERIFICATION` (Vercel → Project → Settings →
 * Environment Variables) — sem isso a tag simplesmente não é
 * renderizada, nunca quebra o build.
 */
export function getGoogleSiteVerification(): string | undefined {
  return process.env.GOOGLE_SITE_VERIFICATION || undefined;
}

/**
 * Dados reais da empresa (Dossiê 45 — Rotta Legal, Trust & Community
 * Center) — fonte única, consumida por Termos/Privacidade/rodapé/
 * demais documentos legais. NUNCA inventar um dado que não exista
 * aqui: os únicos fatos confirmados no código antes desta entrega são
 * razão social/CNPJ/foro (já usados em `(marketing)/termos`,
 * `(marketing)/privacidade`, `(marketing)/layout.tsx`) e os e-mails
 * `contato@`/`suporte@`/`notificacoes@rotta.com.br`. Não existe (e não
 * deve ser inventado) endereço físico, telefone, DPO nomeado ou e-mail
 * dedicado de segurança — quando a Rotta definir esses dados, atualizar
 * SÓ aqui.
 */
export const COMPANY_LEGAL_NAME = "Rotta do Brasil Tecnologia e Soluções de Transportes";
export const COMPANY_CNPJ = "54.623.584/0001-80";
export const COMPANY_FORUM = "Maricá/RJ";
export const CONTACT_EMAIL = "contato@rotta.com.br";
export const SUPPORT_EMAIL = "suporte@rotta.com.br";
/**
 * Não existe um endereço `security@rotta.com.br` dedicado hoje — em vez
 * de inventar um (o prompt que originou esta entrega proíbe
 * explicitamente inventar domínio/e-mail), o canal de divulgação
 * responsável de vulnerabilidade reaproveita o e-mail real de contato,
 * com o assunto pedindo `[SEGURANÇA]` para triagem prioritária. Trocar
 * por um endereço dedicado aqui no dia em que ele existir — nenhum
 * outro arquivo precisa mudar.
 */
export const SECURITY_CONTACT_EMAIL = CONTACT_EMAIL;
export const SECURITY_CONTACT_SUBJECT_HINT = "[SEGURANÇA]";

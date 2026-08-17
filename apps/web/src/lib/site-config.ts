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

/**
 * URL do Portal Admin Rotta (`apps/admin`), deploy separado por decisão
 * de segurança — nunca o mesmo processo/domínio do painel de cliente
 * (Dossiê 22 §4.3: modelo de autorização cross-tenant, superfície de
 * ataque distinta). "Integrar na mesma área de entrar" (pedido do
 * usuário) significa **linkar** para esse app a partir do `/entrar` de
 * `apps/web` — nunca fundir os dois logins num só domínio, o que
 * anularia a própria razão do isolamento.
 *
 * `https://rotta-admin.vercel.app` é o domínio de produção REAL,
 * confirmado ao vivo (curl retornando `<title>Rotta — Admin</title>` e
 * `/entrar` respondendo 200) a partir do nome do projeto Vercel
 * (`rotta-admin`, veja `apps/admin/.vercel/project.json` — a Vercel usa
 * `<projectName>.vercel.app` como domínio padrão de produção quando
 * nenhum domínio próprio foi configurado ainda). `NEXT_PUBLIC_ADMIN_URL`
 * é o escape hatch: dev local (`pnpm dev:admin` sobe em `:3001`) e o dia
 * em que `admin.rotta.com.br` existir (Dossiê 33 §4 — depende de acesso
 * ao registrador que este código não tem) só exigem essa env var, nunca
 * uma mudança de código.
 */
export function getAdminUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_ADMIN_URL;
  if (explicit) {
    return explicit.replace(/\/+$/, "");
  }

  if (process.env.NODE_ENV !== "production") {
    return "http://localhost:3001";
  }

  return "https://rotta-admin.vercel.app";
}

export const SITE_NAME = "Rotta";

export const SITE_DESCRIPTION =
  "A Rotta conecta responsáveis, transportadoras, motoristas e monitores em um único lugar: rastreamento do transporte escolar em tempo real, notificação de embarque e desembarque, e gestão completa da frota — tudo em uma conta só.";

/** Logotipo real da marca (Dossiê 24) — usado como `logo` no JSON-LD Organization e como imagem de fallback do OpenGraph. */
export const SITE_LOGO_PATH = "/brand/rotta-mark-512.png";

export const SITE_INSTAGRAM_URL = "https://www.instagram.com/rotta_app/";

/** Número real de WhatsApp da Rotta do Brasil (fornecido pelo usuário), em E.164 sem "+" — formato exigido pelo `wa.me`. */
export const SITE_WHATSAPP_NUMBER = "5521997099557";

/** Link `wa.me` pronto pra abrir uma conversa com uma mensagem pré-preenchida (nunca dispara nenhuma chamada de API — é só um link `https://wa.me/...`, o próprio WhatsApp do usuário que abre). */
export function buildWhatsAppUrl(message: string): string {
  return `https://wa.me/${SITE_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

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
 * ID de medição do Google Analytics 4 (formato "G-XXXXXXXXXX" —
 * Analytics → Administrador → Fluxos de dados → Web → o ID aparece no
 * topo do fluxo). `NEXT_PUBLIC_` porque o script roda no navegador
 * (Dossiê 23, Seção 8 — só variáveis com esse prefixo chegam ao
 * bundle do cliente). Opcional de propósito, mesma filosofia de
 * `getGoogleSiteVerification`: sem essa env var, `GoogleAnalytics`
 * (`components/google-analytics.tsx`) simplesmente não renderiza nada
 * — nenhum cookie de terceiro é criado até alguém colar um ID real.
 */
export function getGoogleAnalyticsId(): string | undefined {
  return process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || undefined;
}

/**
 * Dados reais da empresa (Dossiê 45 — Rotta Legal, Trust & Community
 * Center) — fonte única, consumida por Termos/Privacidade/rodapé/
 * demais documentos legais. NUNCA inventar um dado que não exista
 * aqui: os únicos fatos confirmados são razão social/CNPJ/foro (já
 * usados em `(marketing)/termos`, `(marketing)/privacidade`,
 * `(marketing)/layout.tsx`). Não existe (e não deve ser inventado)
 * endereço físico, telefone ou DPO nomeado.
 *
 * `rotta.com.br` **não pertence à Rotta hoje** (confirmado ao vivo:
 * hoje é uma página de domínio à venda de terceiro) — os antigos
 * `contato@`/`suporte@rotta.com.br` eram endereços que ninguém
 * consegue receber. Pedido explícito do usuário: até o domínio ser
 * comprado, toda comunicação (contato, suporte, segurança e o funil
 * `/governo`) usa a MESMA caixa real, `rottadobrasil@gmail.com` — um
 * único ponto de origem, trocar só aqui no dia em que existirem
 * endereços dedicados em domínio próprio.
 */
export const COMPANY_LEGAL_NAME = "Rotta do Brasil Tecnologia e Soluções de Transportes";
export const COMPANY_CNPJ = "54.623.584/0001-80";
export const COMPANY_FORUM = "Maricá/RJ";
export const CONTACT_EMAIL = "rottadobrasil@gmail.com";
export const SUPPORT_EMAIL = CONTACT_EMAIL;
/**
 * Não existe um endereço de segurança dedicado hoje — o canal de
 * divulgação responsável de vulnerabilidade reaproveita o e-mail real
 * de contato, com o assunto pedindo `[SEGURANÇA]` para triagem
 * prioritária. Trocar por um endereço dedicado aqui no dia em que ele
 * existir — nenhum outro arquivo precisa mudar.
 */
export const SECURITY_CONTACT_EMAIL = CONTACT_EMAIL;
export const SECURITY_CONTACT_SUBJECT_HINT = "[SEGURANÇA]";

/**
 * Leads do funil B2G (`/governo`) — mesma caixa real que o resto do
 * site (`CONTACT_EMAIL`) até existir um domínio próprio; mantido como
 * export separado (em vez de importar `CONTACT_EMAIL` direto em
 * `governo/page.tsx`) só para deixar explícito, em quem lê aquele
 * arquivo, que aquele e-mail é o canal do funil B2G especificamente.
 */
export const GOVERNO_CONTACT_EMAIL = CONTACT_EMAIL;

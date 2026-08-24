/**
 * ACHADO REAL (investigação de 21 ocorrências reais em produção do
 * "Server Components render" sem `digest` — ver
 * `apps/web/src/lib/chunk-load-error.ts`): não havia como saber, olhando
 * pra um relato de erro, se o navegador que reportou estava rodando um
 * bundle desatualizado. `NEXT_PUBLIC_BUILD_ID` fica embutido no bundle
 * JS de cada build (Vercel expõe `VERCEL_GIT_COMMIT_SHA` automaticamente
 * no ambiente de build) — o mesmo valor é embutido em toda página como
 * `<meta name="rotta-build-id">` (`app/layout.tsx`). Comparando os dois
 * (bundle já carregado vs. HTML servido agora) dá pra saber, sem
 * ambiguidade, se um navegador está desatualizado — ver
 * `apps/web/src/providers/stale-build-watchdog.tsx`.
 */
const buildId = process.env.VERCEL_GIT_COMMIT_SHA ?? `dev-${Date.now()}`;

/**
 * Configuracao do Next.js 15 (App Router) — apps/web (Dossie 22, Secao 4.1).
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_BUILD_ID: buildId,
  },
  transpilePackages: [
    "@rotta/ui",
    "@rotta/theme",
    "@rotta/types",
    "@rotta/auth",
    "@rotta/api-client",
    "@rotta/maps",
  ],
  typedRoutes: true,
  /**
   * Dossiê 45 (Rotta Legal, Trust & Community Center) — `/termos` e
   * `/privacidade` migraram para dentro da Documentação Rotta
   * (`/legal/termos`, `/legal/privacidade`), com navegação lateral,
   * índice e versionamento. Redirect permanente para não quebrar links
   * já publicados/indexados nas URLs antigas.
   */
  async redirects() {
    return [
      { source: "/termos", destination: "/legal/termos", permanent: true },
      { source: "/privacidade", destination: "/legal/privacidade", permanent: true },
    ];
  },
};

export default nextConfig;

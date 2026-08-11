/**
 * Configuracao do Next.js 15 (App Router) — apps/web (Dossie 22, Secao 4.1).
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  reactStrictMode: true,
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

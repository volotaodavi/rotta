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
  ],
  experimental: {
    typedRoutes: true,
  },
};

export default nextConfig;

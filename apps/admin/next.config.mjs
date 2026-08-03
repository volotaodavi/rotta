/**
 * Configuracao do Next.js 15 (App Router) — apps/admin (Dossie 22, Secao 4.3).
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
};

export default nextConfig;

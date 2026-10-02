/*
  Identidade do build, para o Admin poder saber se um navegador está
  rodando um deploy velho (02/10/2026) — mesmo mecanismo que
  `apps/web/next.config.mjs` já tinha. A Vercel expõe
  `VERCEL_GIT_COMMIT_SHA` sozinha no ambiente de build; fora dela o
  valor é "development" e o watchdog simplesmente nunca acha
  divergência.
*/
const isVercelBuild = Boolean(process.env.VERCEL);
const buildId = process.env.VERCEL_GIT_COMMIT_SHA ?? (isVercelBuild ? undefined : "development");

if (isVercelBuild && !buildId) {
  throw new Error(
    "VERCEL_GIT_COMMIT_SHA não está disponível durante o build da Vercel — " +
      "sem ele não há como identificar de qual deploy veio o bundle do Admin. Não prosseguir.",
  );
}

/**
 * Configuracao do Next.js 15 (App Router) — apps/admin (Dossie 22, Secao 4.3).
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
};

export default nextConfig;

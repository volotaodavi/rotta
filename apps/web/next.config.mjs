/**
 * ACHADO REAL (investigação de 21+ ocorrências reais em produção do
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
 *
 * `NEXT_PUBLIC_BUILD_ID` é mantido somente para observabilidade. Não o
 * reutilize como `deploymentId`: o SHA do Git tem 40 caracteres, enquanto
 * a Vercel limita identificadores customizados a 32, e o projeto Hobby não
 * possui o roteamento fixo do Skew Protection. Reprodução em produção
 * mostrou que TODOS os segmentos dinâmicos (`/rotas/[id]`,
 * `/veiculos/[id]` e até `/convite/[codigo]`) falhavam enquanto rotas
 * estáticas funcionavam, sempre com o SHA completo em `?dpl=`. A remoção
 * abaixo é deliberada e deve ser validada como experimento isolado.
 */
import { withSentryConfig } from "@sentry/nextjs";

const isVercelBuild = Boolean(process.env.VERCEL);
const buildId = process.env.VERCEL_GIT_COMMIT_SHA ?? (isVercelBuild ? undefined : "development");

if (isVercelBuild && !buildId) {
  throw new Error(
    "VERCEL_GIT_COMMIT_SHA não está disponível durante o build da Vercel — " +
      "sem ele não há como identificar os artefatos deste deployment de forma estável " +
      "NEXT_PUBLIC_BUILD_ID. Não prosseguir com o build.",
  );
}

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

/**
 * `withSentryConfig` embrulha o build pra registrar o release/source maps
 * no Sentry (aqui, GlitchTip — mesmo protocolo, ver
 * `instrumentation-client.ts`). Sem `SENTRY_AUTH_TOKEN` configurado (não
 * temos um), o upload de source map é pulado silenciosamente — o SDK
 * continua funcionando normalmente pra captura de erro, só não resolve
 * nomes de arquivo/linha originais a partir do minificado.
 */
export default withSentryConfig(nextConfig, {
  silent: true,
  disableLogger: true,
  sourcemaps: {
    disable: true,
  },
  telemetry: false,
});

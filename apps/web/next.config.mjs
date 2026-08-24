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
 * Isso só cobria OBSERVABILIDADE, nunca a causa: uma 2ª conta real
 * (`Davi Volotão`, build `240d0b5...`) reproduziu a mesma assinatura
 * minutos depois de um deploy, justo abrindo `/rotas/[id]` de uma rota
 * criada segundos antes — o padrão clássico de "version skew" (o
 * navegador já carregou o bundle de um deploy, mas a navegação seguinte
 * é respondida por um deploy diferente, e o payload RSC não bate com os
 * módulos que o cliente já tem). `deploymentId` (Next.js, nativo) é o
 * mecanismo que ataca a CAUSA: com ele configurado, o próprio Next.js
 * marca cada asset/navegação com o deployment de origem e consegue
 * reconhecer um descompasso ANTES de tentar renderizar um payload
 * incompatível — sem isso configurado, o Next não tinha como distinguir
 * "meu deploy" de "outro deploy" e só sobrava deixar o erro genérico
 * estourar no Error Boundary. Isso NÃO substitui o Skew Protection
 * gerenciado da Vercel (mantém roteamento fixo pro deployment antigo
 * enquanto ele ainda tem clientes ativos) — esse recurso é só de
 * planos Pro/Enterprise (ver https://vercel.com/docs/skew-protection),
 * e o projeto está no Hobby. `deploymentId` sozinho não garante que um
 * asset do deploy anterior continue resolvendo depois de um deploy novo
 * — é uma mitigação real do lado do cliente, não uma garantia completa.
 */
const isVercelBuild = Boolean(process.env.VERCEL);
const deploymentId = process.env.VERCEL_GIT_COMMIT_SHA ?? (isVercelBuild ? undefined : "development");

if (isVercelBuild && !deploymentId) {
  throw new Error(
    "VERCEL_GIT_COMMIT_SHA não está disponível durante o build da Vercel — " +
      "sem ele não há como identificar os artefatos deste deployment de forma estável " +
      "(nem NEXT_PUBLIC_BUILD_ID nem deploymentId). Não prosseguir com o build.",
  );
}

/**
 * Configuracao do Next.js 15 (App Router) — apps/web (Dossie 22, Secao 4.1).
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  reactStrictMode: true,
  // Ver a nota grande acima — mesmo identificador usado nos dois lugares
  // (nunca gerar dois valores diferentes pra "o mesmo deploy").
  deploymentId,
  env: {
    NEXT_PUBLIC_BUILD_ID: deploymentId,
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

/**
 * Configuração do Lighthouse CI (Dossiê 34 — Prompt 24, qualidade).
 * Mede Performance/Acessibilidade/Boas práticas/SEO das páginas
 * públicas mais importantes a cada push (Dossiê 23, `.github/workflows/ci.yml`).
 *
 * Limiares em modo "warn", não "error", DE PROPÓSITO nesta primeira
 * entrega: nenhum score real jamais foi medido aqui — travar o build
 * num número não verificado seria inventar um alvo, o oposto da
 * disciplina de "nunca afirmar o que não foi confirmado" seguida em
 * toda a Rotta. Depois que a primeira execução real em CI produzir uma
 * baseline, subir para "error" com os números medidos (ver Dossiê 34).
 */
module.exports = {
  ci: {
    collect: {
      startServerCommand: "pnpm --filter=@rotta/web start",
      url: [
        "http://localhost:3000/",
        "http://localhost:3000/faq",
        "http://localhost:3000/planos",
        "http://localhost:3000/status",
      ],
      numberOfRuns: 1,
      settings: {
        preset: "desktop",
      },
    },
    assert: {
      assertions: {
        "categories:performance": ["warn", { minScore: 0.85 }],
        "categories:accessibility": ["warn", { minScore: 0.95 }],
        "categories:best-practices": ["warn", { minScore: 0.9 }],
        "categories:seo": ["warn", { minScore: 0.9 }],
      },
    },
    upload: {
      target: "temporary-public-storage",
    },
  },
};

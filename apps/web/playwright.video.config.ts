import { defineConfig } from "@playwright/test";

import base from "./playwright.config";

/**
 * A mesma suíte, gravando vídeo.
 *
 * ## Por que separado, e não um `video: "on"` no config principal
 *
 * Porque gravar custa: cada fluxo vira um `.webm` de alguns megabytes,
 * e a CI roda esta suíte em todo push. O que se quer lá é o rastro do
 * que FALHOU (`trace: "on-first-retry"`), não o filme do que passou.
 *
 * Aqui é o contrário: o objetivo é justamente o filme do que passou —
 * mostrar o produto funcionando para quem não consegue abrir o painel,
 * que é o caso de qualquer sessão rodando num contêiner sem tela.
 *
 * Uso:
 *   pnpm --filter @rotta/web exec playwright test --config playwright.video.config.ts
 *
 * Os vídeos saem em `test-results/`, um por fluxo.
 */
export default defineConfig({
  ...base,
  use: {
    ...base.use,
    video: { mode: "on", size: { width: 1280, height: 720 } },
  },
});

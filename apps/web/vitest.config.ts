import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

/**
 * Infraestrutura de testes de componente (Dossiê 34 — Prompt 24).
 * Antes desta entrega, `pnpm test` em `apps/web` era um `echo` sem
 * nenhum runner configurado (Dossiê 23, Seção 10 já sinalizava isso
 * como pendente). Vitest + Testing Library, não Jest — ambiente
 * Next.js 15/Vite-like já usado pelo próprio Next em dev, mais rápido
 * que Jest para este tipo de teste (DOM via jsdom, sem transpilar todo
 * o app a cada run).
 */
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    globals: true,
    css: false,
    // `src/config/env.ts` valida (via Zod) `NEXT_PUBLIC_API_URL` no
    // import do módulo — precisa existir antes de qualquer teste
    // importar (mesmo indiretamente) `@/config/env` ou `@/lib/api-client`.
    env: {
      NEXT_PUBLIC_API_URL: "http://localhost:3333/v1",
    },
  },
  resolve: {
    alias: {
      "@": new URL("./src", import.meta.url).pathname,
      /**
       * Migração pro React 19 (`apps/web`): pacotes como `@rotta/auth`/
       * `@rotta/ui` têm sua própria `devDependency` de `react` fixada em
       * `^18.3.1` (exigência do `apps/mobile`), resolvida pelo pnpm numa
       * cópia física separada da `react@19.2.8` deste app. O bundler do
       * Next (`next build`/`next dev`) já resolve tudo pra uma única
       * cópia sozinho — confirmado com build de produção limpo — mas o
       * Vitest resolve módulos pelo caminho real de cada arquivo (sem
       * essa camada extra do Next), então sem forçar aqui a mesma cópia
       * ele renderiza componentes desses pacotes com um `react` diferente
       * do `react-dom` — daí o crash real "A React Element from an older
       * version of React was rendered" (reproduzido e corrigido nesta
       * migração).
       */
      react: fileURLToPath(new URL("./node_modules/react", import.meta.url)),
      "react-dom": fileURLToPath(new URL("./node_modules/react-dom", import.meta.url)),
    },
  },
});

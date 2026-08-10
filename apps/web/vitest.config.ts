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
    },
  },
});

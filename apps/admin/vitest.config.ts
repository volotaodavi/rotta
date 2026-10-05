import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

/**
 * Testes de componente do Admin (05/10/2026).
 *
 * Até hoje o `pnpm test` daqui era um `echo`, e esse buraco cobrou
 * juros: os dois defeitos achados em 02/10/2026 (o foco que fugia do
 * campo a cada letra digitada e o filtro de contas que nunca casava
 * nada, porque procurava um status que o banco não tem) estavam
 * exatamente neste app, e os dois passariam batido em qualquer
 * verificação que existisse. O Admin é onde se apaga conta, se aprova
 * documento e se olha dinheiro: é o último lugar que deveria estar sem
 * rede.
 *
 * Mesma montagem de `apps/web` (Vitest e Testing Library, não Jest),
 * com uma diferença: este app está em React 18, então não precisa do
 * alias que lá existe para forçar uma cópia única do React.
 */
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    globals: true,
    css: false,
    /*
      `src/config/env.ts` valida a URL da API no import do módulo, via
      Zod. Sem isto, qualquer teste que importe (mesmo indiretamente)
      `@/lib/api-client` falha antes de rodar.
    */
    env: {
      NEXT_PUBLIC_API_URL: "http://localhost:3333/v1",
    },
    /*
      `@rotta/icons` reexporta `lucide-react`, que o Vitest carregaria
      pela resolução do Node, com a cópia de React do próprio pacote.
      Duas cópias de React na mesma árvore quebram a renderização com
      "A React Element from an older version of React was rendered" (o
      erro que impediu de testar o `Modal.Header` em 02/10/2026).
      Inlinar força as duas a passarem pelo Vite, com um React só.
    */
    server: { deps: { inline: ["@rotta/icons", "lucide-react", "@rotta/ui"] } },
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});

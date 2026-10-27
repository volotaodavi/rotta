import { createRequire } from "node:module";
import { dirname, join } from "node:path";
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
/**
 * O caminho do build ESM do lucide, descoberto em vez de escrito à
 * mão: o caminho real passa por `.pnpm/lucide-react@<versao>_react@<versao>`,
 * e fixá-lo quebraria na próxima atualização de qualquer um dos dois.
 */
const lucideEsm = join(
  dirname(createRequire(import.meta.url).resolve("lucide-react/package.json")),
  "dist/esm/lucide-react.mjs",
);

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
    /**
     * `lucide-react` (por trás de `@rotta/icons`) está instalado UMA
     * vez no monorepo, resolvido contra `react@18.3.1` por exigência do
     * `apps/mobile`. Ele é CommonJS, então o Vitest o externalizava e
     * deixava o Node resolvê-lo: o `require("react")` de dentro dele
     * caía na cópia 18, fora do alcance do `alias` abaixo. O ícone
     * nascia na cópia 18 e era renderizado pela 19, dando o crash
     * "A React Element from an older version of React was rendered".
     *
     * Na prática isso impedia testar QUALQUER componente da web com
     * ícone, que é quase todos. Não é conveniência de teste: era o que
     * mantinha a web sem testes de componente.
     */
    server: {
      deps: {
        inline: ["lucide-react", "@rotta/icons"],
      },
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
      /**
       * O mesmo problema do bloco acima, uma camada mais fundo, e que
       * só aparece quando o componente sob teste usa `@rotta/icons`.
       *
       * `lucide-react` está instalado UMA vez, resolvido contra
       * `react@18.3.1` (exigência do `apps/mobile`). Ele não importa
       * `react`, importa `react/jsx-runtime`, e esse especificador
       * escapava do alias acima: o ícone era criado pela cópia 18 e
       * renderizado pela 19, dando o crash "A React Element from an
       * older version of React was rendered".
       *
       * Na prática isso impedia testar QUALQUER componente da web com
       * ícone, que é quase todos. Não é um ajuste de conveniência de
       * teste: era o que mantinha a web sem testes de componente.
       */
      /**
       * O ESM do lucide, não o CJS.
       *
       * O `main` do pacote é CommonJS, e o `require("react")` de dentro
       * dele é resolvido pelo Node, fora do alcance dos aliases acima:
       * caía na cópia `react@18.3.1` contra a qual o pnpm instalou o
       * lucide (exigência do `apps/mobile`). O build ESM usa `import`,
       * que passa pelo Vite e recebe o alias.
       */
      "lucide-react": fileURLToPath(new URL(`file://${lucideEsm}`)),
      "react/jsx-runtime": fileURLToPath(
        new URL("./node_modules/react/jsx-runtime.js", import.meta.url),
      ),
      "react/jsx-dev-runtime": fileURLToPath(
        new URL("./node_modules/react/jsx-dev-runtime.js", import.meta.url),
      ),
    },
    // Rede de segurança para qualquer pacote que chegue com a própria
    // cópia: uma só instância de cada um no grafo do teste.
    dedupe: ["react", "react-dom"],
  },
});

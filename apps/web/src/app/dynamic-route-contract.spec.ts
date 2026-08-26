import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Regressão do incidente "Server Components render" indeterminístico,
 * reproduzido em rotas dinâmicas do App Router (`/rotas/[id]`,
 * `/veiculos/[id]` — e, até ser eliminada, `/convite/[codigo]`, a pior
 * das três: todo código de convite é único, então todo acesso era
 * necessariamente "primeiro render deste segmento exato"), pública e
 * autenticada, nunca em rota estática. Causa apontada: `page.tsx` era
 * um Client Component (`"use client"`) que recebia `params:
 * Promise<...>` e resolvia a Promise no próprio cliente
 * (`use(params)`/`useParams()` sobre a prop) — não é o contrato
 * suportado pelo App Router. `page.tsx` agora é um Server Component
 * mínimo que faz `await params` e repassa só o valor final (`string`)
 * por prop pro Client Component correspondente.
 *
 * `/convite/[codigo]` foi removida de vez (não só corrigida): virou
 * `/convite/page.tsx` estática, lendo `codigo` de `useSearchParams()`
 * em vez de `params` — sem nenhum segmento `[dinâmico]` envolvido, o
 * motor implicado no incidente nunca entra em jogo. Ver
 * `next.config.mjs` (`redirects()`) para o link de compatibilidade
 * com convites antigos.
 *
 * Este teste verifica o CONTRATO estático de cada `page.tsx` restante
 * (nunca `"use client"`, nunca `use(` de `params`) — não substitui o
 * teste real em produção, só impede que o mesmo padrão volte por
 * acidente numa dessas páginas.
 */
describe("contrato Server Component das rotas dinâmicas (regressão)", () => {
  const root = join(__dirname);

  const pages = [
    { name: "/rotas/[id]", path: join(root, "(dashboard)/rotas/[id]/page.tsx") },
    { name: "/veiculos/[id]", path: join(root, "(dashboard)/veiculos/[id]/page.tsx") },
  ];

  for (const page of pages) {
    it(`${page.name}/page.tsx é Server Component (sem "use client") e usa await params`, () => {
      const source = readFileSync(page.path, "utf8");

      expect(source).not.toContain('"use client"');
      // Checa a IMPORTAÇÃO real de `use` do React (não o texto dos
      // comentários explicativos, que citam `use(params)` de propósito
      // ao descrever o que foi removido).
      expect(source).not.toMatch(/import\s*{[^}]*\buse\b[^}]*}\s*from\s*"react"/);
      expect(source).toMatch(/await params/);
      expect(source).toMatch(/params:\s*Promise</);
    });
  }
});

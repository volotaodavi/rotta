/**
 * ACHADO REAL (bug descoberto testando o próprio watchdog): `env` do
 * `next.config.mjs` inlina `NEXT_PUBLIC_BUILD_ID` de verdade nas páginas
 * renderizadas no SERVIDOR (`app/layout.tsx`, Server Component — por
 * isso a `<meta name="rotta-build-id">` sempre bate) — mas NÃO chega a
 * ser inlinado no bundle JS que roda no NAVEGADOR (confirmado: o valor
 * não aparece em nenhum arquivo de `.next/static` depois do build).
 * Ler `process.env.NEXT_PUBLIC_BUILD_ID` aqui, no cliente, sempre
 * voltava vazio — o que fazia o watchdog achar (errado) que todo
 * carregamento estava desatualizado.
 *
 * Correção: em vez de depender desse inlining incerto, lê o valor DIRETO
 * da própria `<meta>` já renderizada no HTML que o navegador tem na tela
 * agora — a mesma fonte que `layout.tsx` (servidor) sempre preenche
 * corretamente, sem nenhuma dependência de como o bundler trata
 * `process.env` no lado cliente.
 */
export function getOwnBuildId(): string | null {
  if (typeof document === "undefined") return null;
  return document.querySelector('meta[name="rotta-build-id"]')?.getAttribute("content") ?? null;
}

/** Lê o `rotta-build-id` embutido num HTML bruto (string), sem precisar de um DOM real — usado tanto no navegador quanto em teste. */
export function extractBuildIdFromHtml(html: string): string | null {
  const match = /<meta\s+name="rotta-build-id"\s+content="([^"]*)"/i.exec(html);
  return match?.[1] ?? null;
}

/**
 * Detecta `ChunkLoadError` (e a falha irmã de CSS, "Loading CSS chunk") —
 * achado real depurando o "algo deu errado" reportado repetidas vezes
 * logo após ações que levam a uma página nunca visitada antes na sessão
 * (ex.: `/rotas/[id]` de uma rota recém-criada). Acontece quando o
 * navegador ainda tem em memória as referências de chunk (hash no nome
 * do arquivo) de um deploy ANTERIOR, mas o servidor já trocou pra um
 * deploy novo — os arquivos antigos não existem mais, o `import()`
 * dinâmico do webpack falha, e o React trata isso como um erro comum de
 * render (chega em `error.tsx` como qualquer outro). `digest` nulo e
 * stack sem frames de aplicação (só o loader do webpack) são a
 * impressão digital desse caso — nunca um bug real de componente.
 *
 * A correção nunca é "consertar o código": é reconhecer o padrão e
 * recarregar a página inteira, que busca o HTML novo (com as referências
 * de chunk corretas do deploy atual) — ver uso em cada `error.tsx`.
 */
export function isChunkLoadError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return (
    error.name === "ChunkLoadError" ||
    /loading (chunk|css chunk) \S+ failed/i.test(error.message) ||
    /failed to fetch dynamically imported module/i.test(error.message)
  );
}

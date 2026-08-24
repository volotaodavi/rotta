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

/**
 * ACHADO REAL (investigação do "algo deu errado" recorrente na conta real
 * de um usuário — 21 ocorrências ao longo de dias, sempre segundos depois
 * de criar/abrir uma rota, sempre com `digest` VAZIO). Buscando cada uma
 * na tela "Erros do cliente" do Admin Rotta: todas eram a mesma frase
 * genérica que o Next.js usa pra "algo quebrou no render de Server
 * Components" — só que sem `digest` nenhum. Isso é anômalo: um erro
 * REAL de render em produção sempre ganha um `digest` (é assim que o
 * Next correlaciona com o log do servidor); a ÚNICA forma documentada
 * neste código de essa mensagem aparecer SEM `digest` é o mesmo padrão já
 * mapeado em `isChunkLoadError` acima e em
 * `service-worker-registration.tsx` — o navegador ainda executando algo
 * desatualizado (chunk antigo, payload RSC de um deploy anterior,
 * Service Worker que nunca chegou a atualizar aquela aba) — só que desta
 * vez o próprio Next.js, ao invés de deixar o `import()` falhar com
 * `ChunkLoadError`, absorve a falha internamente e devolve essa mensagem
 * genérica redigida (com `digest: undefined`) direto pro Error Boundary.
 * Fetchs repetidos direto no HTML de produção (curl, sem JS, mesma rota)
 * NUNCA reproduziram esse erro — o problema não está no HTML servido, é
 * sempre algo já em memória/cache no navegador de quem está vendo.
 *
 * Mesma correção que já existe pra `ChunkLoadError`: recarregar a página
 * uma vez (guardado contra loop) resolve, porque busca tudo de novo, sem
 * depender de nada que já estava obsoleto na aba.
 */
export function isStaleClientRenderError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  if ((error as Error & { digest?: string }).digest) return false;
  return /error occurred in the server components render/i.test(error.message);
}

/** Qualquer um dos dois padrões acima — ver `useChunkLoadRecovery`. */
export function isRecoverableStaleBundleError(error: unknown): boolean {
  return isChunkLoadError(error) || isStaleClientRenderError(error);
}

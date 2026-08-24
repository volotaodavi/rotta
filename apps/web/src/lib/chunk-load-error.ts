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
 * de um usuário — 22+ ocorrências ao longo de dias, quase sempre segundos
 * depois de criar/abrir uma rota, sempre com `digest` VAZIO). Buscando
 * cada uma na tela "Erros do cliente" do Admin Rotta: todas eram a mesma
 * frase genérica que o Next.js usa pra "algo quebrou no render de Server
 * Components" — só que sem `digest` nenhum. Isso é anômalo: um erro REAL
 * de render em produção normalmente ganha um `digest` (é assim que o Next
 * correlaciona com o log do servidor).
 *
 * CORREÇÃO DE ROTA (achado numa investigação posterior, com `buildId` da
 * ocorrência mais recente batendo EXATAMENTE com o deploy atual e
 * `serviceWorkerActive: false`): a causa NÃO É sempre "navegador com algo
 * obsoleto em memória" — esta função também casa com uma corrida
 * intermitente de infraestrutura, já vista na investigação ORIGINAL deste
 * mesmo padrão (`fix(web): navegação forçada`, commit `0c90857`): a mesma
 * mensagem, mesmo `digest` vazio, numa navegação pra um segmento dinâmico
 * (`/rotas/[id]`) NUNCA renderizado antes (rota recém-criada) — nunca
 * reproduzido localmente, e a mesma URL exata buscada via `curl` segundos
 * depois sempre voltava limpa (200). Trocar a navegação por
 * `window.location.href` reduziu a frequência mas não eliminou (prova: a
 * ocorrência com `buildId` do deploy atual já usa essa navegação). As
 * duas causas (bundle obsoleto E corrida de cold start num segmento
 * dinâmico novo) produzem o EXATO mesmo sintoma no navegador — o que
 * importa aqui é reconhecer o padrão, não distinguir qual das duas foi
 * desta vez, porque a mitigação é idêntica pras duas.
 *
 * Mesma correção que já existe pra `ChunkLoadError`: recarregar a página
 * (agora até 2 vezes — ver `MAX_RELOAD_ATTEMPTS` em
 * `use-chunk-load-recovery.ts`) resolve nos dois casos, porque busca tudo
 * de novo, sem depender de nada obsoleto na aba nem esperar a mesma
 * invocação fria.
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

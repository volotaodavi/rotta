/**
 * Detecta `ChunkLoadError` (e a falha irmã de CSS, "Loading CSS chunk") —
 * achado real depurando o "algo deu errado" reportado repetidas vezes
 * logo após ações que levam a uma página nunca visitada antes na sessão
 * (ex.: `/rotas/[id]` de uma rota recém-criada). O caso clássico: o
 * navegador ainda tem em memória as referências de chunk (hash no nome
 * do arquivo) de um deploy ANTERIOR, mas o servidor já trocou pra um
 * deploy novo — os arquivos antigos não existem mais, o `import()`
 * dinâmico do webpack falha, e o React trata isso como um erro comum de
 * render (chega em `error.tsx` como qualquer outro). `digest` nulo e
 * stack sem frames de aplicação (só o loader do webpack) são a
 * impressão digital típica desse caso — não um bug de componente.
 *
 * A correção nunca é "consertar o código" pra ESTE padrão específico: é
 * reconhecer a assinatura e recarregar a página inteira, que busca o
 * HTML novo (com as referências de chunk corretas do deploy atual) — ver
 * uso em cada `error.tsx`. `deploymentId` (`next.config.mjs`) ataca a
 * causa mais provável antes que ela chegue até aqui.
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
 * ACHADO REAL (múltiplas ocorrências reais em produção da mesma
 * assinatura — sempre segundos depois de criar/abrir uma rota, sempre
 * com `digest` VAZIO). Buscando cada uma na tela "Erros do cliente" do
 * Admin Rotta: todas eram a mesma frase genérica que o Next.js usa pra
 * "algo quebrou no render de Server Components" — só que sem `digest`
 * nenhum. Isso é anômalo: um erro REAL de render em produção normalmente
 * ganha um `digest` (é assim que o Next correlaciona com o log do
 * servidor) — a ausência dele é o motivo de reconhecer este padrão à
 * parte, não de presumir uma causa específica.
 *
 * O QUE ESTÁ CONFIRMADO: a assinatura (mensagem genérica + `digest`
 * ausente) se repete numa navegação pra um segmento dinâmico
 * (`/rotas/[id]`) NUNCA renderizado antes (rota recém-criada) — em pelo
 * menos duas ocorrências reais, a mesma URL exata buscada via `curl`
 * segundos/minutos depois voltou limpa (200), o que descarta um bug
 * determinístico no código da página pra esses casos específicos.
 *
 * O QUE NÃO ESTÁ CONFIRMADO (e não deve ser tratado como fato só por
 * causa desta assinatura): se é bundle obsoleto no navegador, version
 * skew entre deployments, cold start de função serverless, ou outra
 * causa de infraestrutura — nenhuma delas foi comprovada por stack
 * trace real nem pelos Runtime Logs da Vercel no horário exato; este
 * projeto/sessão não teve acesso a esses logs até agora. `deploymentId`
 * (`next.config.mjs`) ataca a hipótese mais provável (version skew) na
 * causa; esta função só reconhece o SINTOMA, pra qualquer uma das
 * causas possíveis — a mitigação (recarregar a página, ver
 * `use-chunk-load-recovery.ts`) é a mesma independente de qual for.
 *
 * Se um novo erro chegar com `digest` preenchido, ele NÃO casa com esta
 * função (ver o `if` abaixo) — é sinal de exceção real do servidor,
 * correlacionável pelo digest nos Runtime Logs, nunca mais uma ocorrência
 * deste mesmo padrão.
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

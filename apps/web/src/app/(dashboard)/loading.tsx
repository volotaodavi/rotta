import { Skeleton } from "@rotta/ui/web";

/**
 * Carregamento do route group `(dashboard)`.
 *
 * ## Por que não bastava o `loading.tsx` da raiz
 *
 * Ele existe e cobre tudo, mas é um `min-h-screen` com um spinner no
 * meio: enquanto qualquer tela do painel carrega, a pessoa perde o
 * cabeçalho, a navegação e a noção de onde está. Quem clicou em
 * "Veículos" vê a tela inteira virar um círculo girando e não consegue
 * nem desistir e ir para outro lugar.
 *
 * Este arquivo resolve pelo mesmo mecanismo que o `error.tsx` deste
 * grupo já usa: o App Router troca só o `children`, nunca o
 * `layout.tsx` da mesma pasta. A navegação continua na tela, clicável,
 * e só a área de conteúdo mostra que está carregando.
 *
 * ## Por que esqueleto, e não spinner
 *
 * Porque o esqueleto já tem a forma do que vai chegar (um título, uma
 * faixa de números, uma lista), então a página não salta quando o dado
 * entra. Um spinner centralizado some e a tela inteira se reorganiza de
 * uma vez, que é o movimento que faz a pessoa perder a linha que estava
 * lendo.
 *
 * A forma aqui é deliberadamente genérica: 46 telas passam por este
 * arquivo, e um esqueleto que imita uma delas em específico ficaria
 * errado nas outras 45. O que ele promete é só "um título, um resumo e
 * uma lista", que é a estrutura que quase toda tela do painel tem.
 */
export default function DashboardLoading(): JSX.Element {
  return (
    <div
      className="flex flex-col gap-6"
      // `aria-busy` com rótulo: para quem usa leitor de tela, um bloco
      // de caixas cinzas sem nome nenhum é silêncio. O `role="status"`
      // faz o leitor anunciar que a área está carregando sem roubar o
      // foco de onde a pessoa estava.
      role="status"
      aria-busy="true"
      aria-label="Carregando a página"
    >
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-full max-w-md" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, indice) => (
          <Skeleton key={indice} className="h-24" />
        ))}
      </div>

      <div className="flex flex-col gap-2">
        {Array.from({ length: 5 }, (_, indice) => (
          <Skeleton key={indice} className="h-14" />
        ))}
      </div>
    </div>
  );
}

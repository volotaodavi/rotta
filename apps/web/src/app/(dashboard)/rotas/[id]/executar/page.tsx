"use client";

import { useParams } from "next/navigation";

import { ExecuteRouteClient } from "./_components/execute-route-client";

import { SectionErrorBoundary } from "@/components/section-error-boundary";

/**
 * Tela de execução do fluxo novo de Rotas (pedido do usuário: "Para
 * iniciar: deve estar em 'minhas rotas' -> botão deslizante para
 * iniciar a rota desejada -> aparece no openstreet a localização em
 * pino de cada aluno para embarque -> ao chegar próximo (raio de até
 * 1km) poderá embarcar/desembarcar -> notificação chega no responsável
 * -> repete até a finalização"). Separada de `/minha-rota` a pedido
 * explícito do usuário — reimplementa a MESMA lógica já comprovada
 * daquela tela (mapa + raio de 1km + notificação automática), não
 * reaproveita o arquivo, mas reaproveita os mesmos hooks/utils.
 *
 * O conteúdo real vive em `_components/execute-route-client.tsx`
 * (`ExecuteRouteClient`, recebe `routeId`/`onVoltar` como props) — esta
 * página só lê `useParams()` e repassa. "Minhas Rotas"
 * (`rotas/page.tsx`) monta `ExecuteRouteClient` diretamente, embutido,
 * SEM navegar pra este segmento dinâmico (mesmo bug de infraestrutura
 * do Next.js documentado em `rotas/novo/page.tsx`) — esta página
 * continua existindo só pra quem chega direto por um link salvo/
 * compartilhado.
 */
export default function ExecutarRotaPage(): JSX.Element {
  const params = useParams<{ id: string }>();
  return (
    <SectionErrorBoundary label="pagina-executar-rota">
      <ExecuteRouteClient
        routeId={params.id}
        onVoltar={() => {
          window.location.href = "/rotas";
        }}
      />
    </SectionErrorBoundary>
  );
}

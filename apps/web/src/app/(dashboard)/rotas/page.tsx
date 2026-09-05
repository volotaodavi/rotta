"use client";

import {
  Badge,
  Button,
  Card,
  ErrorState,
  Spinner,
  Table,
  Typography,
  buttonVariants,
} from "@rotta/ui/web";
import Link from "next/link";
import { useState } from "react";

import { RouteDetailClient } from "./[id]/_components/route-detail-client";
import { ExecuteRouteClient } from "./[id]/executar/_components/execute-route-client";

import type { ListRoutesParams, Route } from "@rotta/api-client";

import { useRoutesList } from "@/features/routes/hooks/use-routes";
import {
  ROUTE_STATUS_LABEL,
  ROUTE_STATUS_VARIANT,
  formatRouteWeekdaysAbbrev,
} from "@/features/routes/labels";
import { SCHOOL_SHIFT_LABEL } from "@/features/schools/labels";
import { useMyTeam } from "@/features/team/hooks/use-team";

/**
 * "Minhas Rotas" (pedido do usuário: "crie uma aba para 'Criar
 * rota'"... "Minhas rotas aparecerá a rota") — fluxo novo, começando do
 * zero (a aba "Rotas" antiga foi apagada a pedido explícito numa sessão
 * anterior, por causa de um bug de renderização nunca resolvido; esta
 * tela é nova, não uma recuperação daquela).
 *
 * `RoutesService.list` já escopa por papel: Empresa/Gestor veem TODAS
 * as rotas da empresa; Motorista/Monitor autônomo/MEI veem só as
 * PRÓPRIAS (`motoristaPadraoId`/`monitorPadraoId` = o próprio ator) —
 * nenhum filtro adicional é necessário aqui, o mesmo componente serve
 * os dois públicos (painel da empresa e Modo Ação).
 *
 * ACHADO REAL — bug de infraestrutura do próprio Next.js (o mesmo
 * documentado em `rotas/novo/page.tsx`, confirmado pelo usuário: ocorre
 * em QUALQUER conta, não só numa específica): navegar por
 * `window.location.href` OU `router.push` pra `/rotas/[id]` ou
 * `/rotas/[id]/executar` num segmento dinâmico nunca renderizado antes
 * neste deploy dispara, intermitente mas repetidamente em produção
 * (só na Vercel, nunca localmente), um erro interno indeterminístico do
 * motor de Server Components/Suspense do App Router. Como abrir uma
 * rota e executá-la são as duas ações mais centrais deste fluxo, o
 * clique na linha (abrir detalhe) e o botão "Executar" NÃO navegam mais
 * — "Minhas Rotas" monta `RouteDetailClient`/`ExecuteRouteClient`
 * (os mesmos componentes que `/rotas/[id]` e `/rotas/[id]/executar`
 * usam) embutidos NESTA MESMA tela, trocando só o que é exibido via
 * estado local. Zero navegação pro segmento dinâmico = zero chance de
 * bater no gatilho exato do bug (mesma técnica já aplicada em
 * `rotas/novo/page.tsx` pra "criar rota").
 *
 * O botão "Nova rota" continua usando `Link` normal (rota estática
 * `/rotas/novo`, sem esse risco). As páginas `/rotas/[id]` e
 * `/rotas/[id]/executar` em si continuam existindo, pra quem chega
 * direto por um link salvo/compartilhado.
 */
export default function RotasPage(): JSX.Element {
  const params: ListRoutesParams = { page: 1, pageSize: 100 };
  const { data, isLoading, isError, refetch, isFetching } = useRoutesList(params);
  const { data: team } = useMyTeam();
  const [showAll, setShowAll] = useState(false);
  const [openRouteId, setOpenRouteId] = useState<string | null>(null);
  const [executingRouteId, setExecutingRouteId] = useState<string | null>(null);

  const motoristaNome = (id: string | null): string => {
    if (!id) return "Nenhum motorista atribuído";
    return team?.find((member) => member.userId === id)?.nome ?? "Motorista";
  };

  const items = showAll ? data?.items : data?.items.filter((route) => route.status === "ATIVA");

  if (executingRouteId) {
    return (
      <div className="flex flex-col gap-6">
        <ExecuteRouteClient routeId={executingRouteId} onVoltar={() => setExecutingRouteId(null)} />
      </div>
    );
  }

  if (openRouteId) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <Button
          variant="ghost"
          size="sm"
          className="self-start"
          onClick={() => setOpenRouteId(null)}
        >
          ← Voltar para Minhas Rotas
        </Button>
        <RouteDetailClient routeId={openRouteId} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Typography variant="title">Rotas</Typography>
          <Typography variant="bodySmall" color="muted">
            Crie uma rota, adicione os alunos já credenciados e inicie a viagem quando estiver
            pronto.
          </Typography>
        </div>
        <Link href="/rotas/novo" className={buttonVariants({ variant: "primary" })}>
          Nova rota
        </Link>
      </div>

      <Card>
        <Card.Body className="flex flex-col gap-4">
          <div className="flex justify-end">
            <Button variant="ghost" size="sm" onClick={() => setShowAll((current) => !current)}>
              {showAll ? "Mostrar só ativas" : "Mostrar pausadas também"}
            </Button>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <Spinner size="lg" />
            </div>
          ) : isError || !items ? (
            <ErrorState
              message="Não foi possível carregar as rotas."
              onRetry={() => void refetch()}
              isRetrying={isFetching}
            />
          ) : items.length === 0 ? (
            <Typography variant="body" color="muted">
              Nenhuma rota ainda.
            </Typography>
          ) : (
            <Table<Route>
              columns={[
                { key: "nome", header: "Rota", render: (route) => route.nome },
                {
                  key: "turno",
                  header: "Turno",
                  render: (route) => SCHOOL_SHIFT_LABEL[route.turno],
                },
                {
                  key: "dias",
                  header: "Dias",
                  render: (route) => formatRouteWeekdaysAbbrev(route.diasSemana),
                },
                {
                  key: "motorista",
                  header: "Motorista",
                  render: (route) => motoristaNome(route.motoristaPadraoId),
                },
                {
                  key: "status",
                  header: "Status",
                  render: (route) => (
                    <Badge variant={ROUTE_STATUS_VARIANT[route.status]}>
                      {ROUTE_STATUS_LABEL[route.status]}
                    </Badge>
                  ),
                },
                {
                  key: "acao",
                  header: "",
                  render: (route) =>
                    route.status === "ATIVA" ? (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={(event) => {
                          event.stopPropagation();
                          setExecutingRouteId(route.id);
                        }}
                      >
                        Executar
                      </Button>
                    ) : null,
                },
              ]}
              rows={items}
              keyExtractor={(route) => route.id}
              onRowClick={(route) => setOpenRouteId(route.id)}
            />
          )}
        </Card.Body>
      </Card>
    </div>
  );
}

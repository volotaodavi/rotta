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
 * Navegação pra `/rotas/[id]` e `/rotas/[id]/executar` usa
 * `window.location.href` (recarga completa), não `router.push` — achado
 * de uma sessão anterior depurando "algo deu errado" logo após entrar
 * num segmento dinâmico 100% novo em produção (Frente 7 do plano
 * aprovado: prevenção de riscos, vazamentos e erros). O botão "Nova
 * rota" usa `Link` normal (rota estática, sem esse risco).
 */
export default function RotasPage(): JSX.Element {
  const params: ListRoutesParams = { page: 1, pageSize: 100 };
  const { data, isLoading, isError, refetch, isFetching } = useRoutesList(params);
  const { data: team } = useMyTeam();
  const [showAll, setShowAll] = useState(false);

  const motoristaNome = (id: string | null): string => {
    if (!id) return "Nenhum motorista atribuído";
    return team?.find((member) => member.userId === id)?.nome ?? "Motorista";
  };

  const items = showAll ? data?.items : data?.items.filter((route) => route.status === "ATIVA");

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
                          window.location.href = `/rotas/${route.id}/executar`;
                        }}
                      >
                        Executar
                      </Button>
                    ) : null,
                },
              ]}
              rows={items}
              keyExtractor={(route) => route.id}
              onRowClick={(route) => {
                window.location.href = `/rotas/${route.id}`;
              }}
            />
          )}
        </Card.Body>
      </Card>
    </div>
  );
}

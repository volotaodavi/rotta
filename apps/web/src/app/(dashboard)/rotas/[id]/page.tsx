"use client";

import { useAuth } from "@rotta/auth/web";
import { Badge, Button, Card, ErrorState, Spinner, Typography } from "@rotta/ui/web";
import { useParams } from "next/navigation";

import { RouteOptimizationSection } from "./_components/route-optimization-section";
import { StopsSection } from "./_components/stops-section";
import { StudentsSection } from "./_components/students-section";

import { SectionErrorBoundary } from "@/components/section-error-boundary";
import {
  useRoute,
  useRouteStops,
  useRouteStudents,
  useUpdateRoute,
} from "@/features/routes/hooks/use-routes";
import {
  ROUTE_STATUS_LABEL,
  ROUTE_STATUS_VARIANT,
  formatRouteWeekdaysAbbrev,
} from "@/features/routes/labels";
import { SCHOOL_SHIFT_LABEL } from "@/features/schools/labels";
import { useMyTeam } from "@/features/team/hooks/use-team";


/**
 * Passos 2+3 do assistente "Criar rota" (Frente 4 do plano aprovado) —
 * paradas + alunos + "Concluir rota". Sem uma `RouteStop` real, não há
 * onde embarcar/desembarcar ninguém; sem um `RouteStudent`, o aluno
 * credenciado (`Contract` ATIVO) nunca aparece na rota do
 * motorista/monitor nem no mapa do responsável. O endereço da parada é
 * geocodificado pela Rotta Geo AI (`POST /geo/geocode`, Nominatim/OSM)
 * — nunca lat/long digitado manualmente.
 *
 * Frente 7 (prevenção de riscos, vazamentos e erros): três
 * `SectionErrorBoundary` — um envolvendo a página INTEIRA (não só o
 * `return` de sucesso, pra também cobrir os hooks chamados no topo do
 * componente) e um por seção (Rotta Route AI/paradas/alunos), pra um bug
 * isolado numa seção nunca derrubar a tela inteira e esconder até a
 * navegação e o cabeçalho da rota. Ver
 * `apps/web/src/components/section-error-boundary.tsx`.
 */
export default function RotaDetalhePage(): JSX.Element {
  return (
    <SectionErrorBoundary label="pagina-rota-detalhe">
      <RotaDetalheContent />
    </SectionErrorBoundary>
  );
}

function RotaDetalheContent(): JSX.Element {
  const params = useParams<{ id: string }>();
  const routeId = params.id;

  const {
    data: route,
    isLoading: isLoadingRoute,
    isError: isRouteError,
    refetch: refetchRoute,
    isFetching: isFetchingRoute,
  } = useRoute(routeId);
  const { data: stops, isLoading: isLoadingStops } = useRouteStops(routeId);
  const { data: routeStudents, isLoading: isLoadingStudents } = useRouteStudents(routeId);
  const { data: team } = useMyTeam();
  const { user } = useAuth();
  const updateRoute = useUpdateRoute(routeId);

  if (isLoadingRoute) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size="lg" />
      </div>
    );
  }

  /**
   * Esta é a tela pra onde `/rotas/novo` navega logo depois de criar a
   * rota — sem isso, qualquer falha transitória nesse primeiro fetch
   * (ex.: cold start do Render, réplica de leitura ainda sem ver a rota
   * recém-criada) deixaria a tela presa num spinner infinito, sem erro
   * visível nem botão de tentar de novo.
   */
  if (isRouteError || !route) {
    return (
      <ErrorState
        message="Não foi possível carregar esta rota."
        onRetry={() => void refetchRoute()}
        isRetrying={isFetchingRoute}
      />
    );
  }

  // Motorista autônomo/MEI nunca aparece em `useMyTeam()` (é `role: "empresa"`,
  // não "motorista"), mas pode muito bem ser ele mesmo o `motoristaPadraoId`
  // da própria rota — sem este fallback, a rota mostrava "Nenhum motorista
  // atribuído ainda" mesmo já tendo um.
  const motoristaNome =
    team?.find((m) => m.userId === route.motoristaPadraoId)?.nome ??
    (route.motoristaPadraoId === user?.id ? user?.nome : undefined);

  const podeConcluir = (stops?.length ?? 0) > 0 && (routeStudents?.length ?? 0) > 0;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Typography variant="title">{route.nome}</Typography>
          <Typography variant="bodySmall" color="muted">
            {SCHOOL_SHIFT_LABEL[route.turno]} · {formatRouteWeekdaysAbbrev(route.diasSemana ?? [])}
            {motoristaNome
              ? ` · Motorista: ${motoristaNome}`
              : " · Nenhum motorista atribuído ainda"}
          </Typography>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Badge variant={ROUTE_STATUS_VARIANT[route.status]}>
            {ROUTE_STATUS_LABEL[route.status]}
          </Badge>
          <Button
            variant="secondary"
            size="sm"
            isLoading={updateRoute.isPending}
            onClick={() =>
              updateRoute.mutate({ status: route.status === "ATIVA" ? "PAUSADA" : "ATIVA" })
            }
          >
            {route.status === "ATIVA" ? "Pausar rota" : "Ativar rota"}
          </Button>
        </div>
      </div>

      {route.status === "PAUSADA" && podeConcluir ? (
        // Vincular o primeiro aluno a uma rota com parada já ativa
        // automaticamente no backend (`RoutesService.addStudent`) — este
        // card só aparece se a empresa pausou manualmente uma rota que já
        // tinha tudo pronto, nunca mais como parte do fluxo normal de criação.
        <Card className="border-success/40 bg-success/5">
          <Card.Body className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Typography variant="bodySmall">
              Você pausou esta rota, mas ela já tem parada e aluno credenciado. Reative para ela
              voltar a aparecer em &quot;Minhas Rotas&quot; para o motorista e o monitor.
            </Typography>
            <Button
              variant="primary"
              isLoading={updateRoute.isPending}
              onClick={() => updateRoute.mutate({ status: "ATIVA" })}
            >
              Reativar rota
            </Button>
          </Card.Body>
        </Card>
      ) : route.status === "PAUSADA" ? (
        <Card>
          <Card.Body>
            <Typography variant="bodySmall" color="danger">
              Esta rota está pausada: ela não aparece em &quot;Minhas Rotas&quot; para o motorista
              nem para o monitor enquanto estiver assim. Adicione ao menos uma parada e um aluno
              abaixo — a rota é ativada automaticamente assim que o primeiro aluno for vinculado.
            </Typography>
          </Card.Body>
        </Card>
      ) : null}

      {!route.motoristaPadraoId ? (
        <Card>
          <Card.Body>
            <Typography variant="bodySmall" color="danger">
              Esta rota ainda não tem motorista atribuído: edite a rota (Equipe → vincular) antes de
              esperar que ela apareça em &quot;Minhas Rotas&quot; para alguém.
            </Typography>
          </Card.Body>
        </Card>
      ) : null}

      <SectionErrorBoundary label="paradas-da-rota">
        <StopsSection routeId={routeId} stops={stops} isLoading={isLoadingStops} />
      </SectionErrorBoundary>

      {stops && stops.length >= 3 ? (
        <SectionErrorBoundary label="rotta-route-ai">
          <RouteOptimizationSection routeId={routeId} stops={stops} />
        </SectionErrorBoundary>
      ) : null}

      <SectionErrorBoundary label="alunos-da-rota">
        <StudentsSection
          routeId={routeId}
          routeTurno={route.turno}
          stops={stops ?? []}
          routeStudents={routeStudents}
          isLoading={isLoadingStudents}
        />
      </SectionErrorBoundary>

      {/*
       * "Concluir rota" (pedido do usuário, fluxo novo: "Gerou uma rota
       * -> adicionar alunos -> concluir rota -> 'minhas rotas' aparecerá
       * a rota"). A rota já foi ativada sozinha pelo backend assim que o
       * primeiro aluno foi vinculado (`RoutesService.addStudent`) — este
       * botão não muda mais nenhum estado, só confirma visualmente o
       * passo pedido e leva de volta pra "Minhas Rotas", navegação
       * forçada (Frente 7 do plano aprovado).
       */}
      <Card className={podeConcluir ? "border-success/40 bg-success/5" : undefined}>
        <Card.Body className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Typography variant="bodySmall">
            {podeConcluir
              ? "Rota pronta: já tem parada e aluno credenciado."
              : "Adicione ao menos uma parada e um aluno para poder concluir."}
          </Typography>
          <Button
            variant="primary"
            disabled={!podeConcluir}
            onClick={() => {
              window.location.href = "/rotas";
            }}
          >
            Concluir rota
          </Button>
        </Card.Body>
      </Card>
    </div>
  );
}

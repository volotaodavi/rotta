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
 * Detalhe de Rota — paradas + alunos. Fecha o loop que faltava: sem uma
 * `RouteStop` real, não há onde embarcar/desembarcar ninguém; sem um
 * `RouteStudent`, o aluno credenciado (`Contract` ATIVO) nunca aparece
 * na rota do motorista nem no mapa do responsável. O endereço da parada
 * é geocodificado pela mesma Rotta Geo AI (`POST /geo/geocode`,
 * Nominatim/OSM) usada em todo o resto da plataforma — nunca lat/long
 * digitado manualmente.
 *
 * Reestruturada (pedido do usuário, depois de repetidas telas de "algo
 * deu errado" logo após criar uma rota): as 3 seções abaixo agora vivem
 * em arquivos próprios (`_components/`) e cada uma tem seu próprio
 * `SectionErrorBoundary` — se QUALQUER uma delas lançar uma exceção
 * (motivo real de existir: um bug isolado numa seção nunca mais deve
 * derrubar a tela inteira, escondendo até a navegação e o cabeçalho da
 * rota). Ver `apps/web/src/components/section-error-boundary.tsx`.
 */
export default function RotaDetalhePage(): JSX.Element {
  return (
    // Boundary EXTRA envolvendo o componente INTEIRO (não só o JSX do
    // `return` de sucesso) — achado real da investigação: os 3
    // boundaries por seção não bastaram, o "algo deu errado" continuou
    // aparecendo mesmo depois do fix de ChunkLoadError e do Service
    // Worker, provando que o que quebra está em algum lugar FORA das 3
    // seções (cabeçalho, cards de status, ou um dos hooks chamados no
    // topo do componente) — um boundary só dentro do `return` nunca
    // capturaria uma exceção lançada ANTES dele ser construído. Um Error
    // Boundary de classe do React captura qualquer exceção lançada
    // durante o render dos filhos, direto no navegador — ao contrário do
    // `error.tsx` do Next, nunca vem com a mensagem redigida:
    // `SectionErrorBoundary` manda a mensagem e a stack REAIS pro
    // `reportClientError`, incluindo agora também o `componentStack`.
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
   * Achado real (pedido do usuário: "aparece que 'algo deu errado' ao
   * criar uma rota"): esta é a tela pra onde `/rotas/novo` navega logo
   * depois de criar a rota — sem isso, qualquer falha transitória nesse
   * primeiro fetch (ex.: cold start do Render, réplica de leitura ainda
   * sem ver a rota recém-criada) deixava a tela presa num spinner
   * infinito, sem erro visível nem botão de tentar de novo.
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
  // não "motorista" — mesmo achado de `/rotas/novo`), mas pode muito bem ser
  // ele mesmo o `motoristaPadraoId` da própria rota — sem este fallback, a
  // rota mostrava "Nenhum motorista atribuído ainda" mesmo já tendo um.
  const motoristaNome =
    team?.find((m) => m.userId === route.motoristaPadraoId)?.nome ??
    (route.motoristaPadraoId === user?.id ? user?.nome : undefined);

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

      {route.status === "PAUSADA" &&
      (stops?.length ?? 0) > 0 &&
      (routeStudents?.length ?? 0) > 0 ? (
        /*
         * Pedido do usuário: "ao criar uma rota, não deverá ir para
         * 'pausada'. Deverá ser ativa... após selecionar os alunos,
         * salvar para dar início". Desde então (`RoutesService.addStudent`,
         * apps/api) vincular o primeiro aluno a uma rota com parada já
         * ativa ela automaticamente — este card só aparece se a empresa
         * PAUSOU manualmente uma rota que já tinha tudo pronto, nunca
         * mais como parte do fluxo normal de criação.
         */
        <Card className="border-success/40 bg-success/5">
          <Card.Body className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Typography variant="bodySmall">
              Você pausou esta rota, mas ela já tem parada e aluno credenciado. Reative para ela
              voltar a aparecer em &quot;Minha Rota&quot; para o motorista e o monitor.
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
              Esta rota está pausada: ela não aparece em &quot;Minha Rota&quot; para o motorista nem
              para o monitor enquanto estiver assim. Adicione ao menos uma parada e um aluno abaixo
              — a rota é ativada automaticamente assim que o primeiro aluno for vinculado.
            </Typography>
          </Card.Body>
        </Card>
      ) : null}

      {!route.motoristaPadraoId ? (
        <Card>
          <Card.Body>
            <Typography variant="bodySmall" color="danger">
              Esta rota ainda não tem motorista atribuído: edite a rota (Equipe → vincular) antes de
              esperar que ela apareça em &quot;Minha Rota&quot; para alguém.
            </Typography>
          </Card.Body>
        </Card>
      ) : null}

      <SectionErrorBoundary label="paradas-da-rota">
        <StopsSection routeId={routeId} stops={stops} isLoading={isLoadingStops} />
      </SectionErrorBoundary>

      <SectionErrorBoundary label="rotta-route-ai">
        <RouteOptimizationSection routeId={routeId} stops={stops ?? []} />
      </SectionErrorBoundary>

      <SectionErrorBoundary label="alunos-da-rota">
        <StudentsSection
          routeId={routeId}
          routeTurno={route.turno}
          stops={stops ?? []}
          routeStudents={routeStudents}
          isLoading={isLoadingStudents}
        />
      </SectionErrorBoundary>
    </div>
  );
}

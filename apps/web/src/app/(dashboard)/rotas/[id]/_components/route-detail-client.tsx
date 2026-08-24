"use client";

import { useAuth } from "@rotta/auth/web";
import { Badge, Button, Card, ErrorState, Spinner, Typography } from "@rotta/ui/web";

import { RouteOptimizationSection } from "./route-optimization-section";
import { StopsSection } from "./stops-section";
import { StudentsSection } from "./students-section";

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
import { recordCheckpoint } from "@/lib/render-checkpoint";


interface RouteDetailClientProps {
  routeId: string;
}

/**
 * CAUSA CONFIRMADA (investigação do incidente "Server Components
 * render" indeterminístico, reproduzido em TODA rota dinâmica do App
 * Router — `/rotas/[id]`, `/veiculos/[id]`, `/convite/[codigo]`, tanto
 * pública quanto autenticada, nunca numa rota estática): este arquivo
 * era `page.tsx` diretamente, um Client Component (`"use client"`) que
 * declarava `params: Promise<{ id: string }>` e chamava
 * `useParams<{ id: string }>()`/`use(params)` pra resolver a Promise
 * dentro do próprio cliente. Passar a Promise de `params` pra um
 * Client Component (ou resolvê-la lá dentro) não é o contrato suportado
 * pelo App Router do Next 15.5.22 + React 18.3.1 — o Server Component
 * (`page.tsx`) precisa fazer `await params` e entregar só o valor final
 * (`string`) por prop. `dynamic(..., { ssr: false })` (nesta página
 * inteira e nas três seções abaixo) foi tentado antes como contenção e
 * NÃO resolveu — removido: mascarava o sintoma, nunca a causa.
 */
export function RouteDetailClient({ routeId }: RouteDetailClientProps): JSX.Element {
  return (
    <SectionErrorBoundary label="pagina-rota-detalhe">
      <RotaDetalheContent routeId={routeId} />
    </SectionErrorBoundary>
  );
}

function RotaDetalheContent({ routeId }: RouteDetailClientProps): JSX.Element {
  // Instrumentação temporária (ver `@/lib/render-checkpoint.ts`) — mantida
  // por enquanto como sinal complementar ao `onRequestError`
  // (`apps/web/src/instrumentation.ts`, captura a exceção real do
  // servidor nos Runtime Logs da Vercel). Escreve síncrono a cada
  // checkpoint — se o render travar em algum ponto entre um e outro, o
  // ÚLTIMO checkpoint gravado antes da tela quebrar sobrevive no
  // `sessionStorage` e aparece no diagnóstico de `(dashboard)/error.tsx`
  // na PRÓXIMA carga.
  recordCheckpoint("rota-detalhe:antes-dos-hooks");

  const {
    data: route,
    isLoading: isLoadingRoute,
    isError: isRouteError,
    refetch: refetchRoute,
    isFetching: isFetchingRoute,
  } = useRoute(routeId);
  recordCheckpoint("rota-detalhe:use-route-ok");
  const { data: stops, isLoading: isLoadingStops } = useRouteStops(routeId);
  recordCheckpoint("rota-detalhe:use-route-stops-ok");
  const { data: routeStudents, isLoading: isLoadingStudents } = useRouteStudents(routeId);
  recordCheckpoint("rota-detalhe:use-route-students-ok");
  const { data: team } = useMyTeam();
  recordCheckpoint("rota-detalhe:use-my-team-ok");
  const { user } = useAuth();
  recordCheckpoint("rota-detalhe:use-auth-ok");
  const updateRoute = useUpdateRoute(routeId);
  recordCheckpoint("rota-detalhe:use-update-route-ok");

  if (isLoadingRoute) {
    recordCheckpoint("rota-detalhe:retorno-spinner-carregando");
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
    recordCheckpoint("rota-detalhe:retorno-erro-carregar-rota");
    return (
      <ErrorState
        message="Não foi possível carregar esta rota."
        onRetry={() => void refetchRoute()}
        isRetrying={isFetchingRoute}
      />
    );
  }
  recordCheckpoint("rota-detalhe:route-carregada-com-sucesso");

  // Motorista autônomo/MEI nunca aparece em `useMyTeam()` (é `role: "empresa"`,
  // não "motorista"), mas pode muito bem ser ele mesmo o `motoristaPadraoId`
  // da própria rota — sem este fallback, a rota mostrava "Nenhum motorista
  // atribuído ainda" mesmo já tendo um.
  const motoristaNome =
    team?.find((m) => m.userId === route.motoristaPadraoId)?.nome ??
    (route.motoristaPadraoId === user?.id ? user?.nome : undefined);
  recordCheckpoint("rota-detalhe:motorista-nome-ok");

  const podeConcluir = (stops?.length ?? 0) > 0 && (routeStudents?.length ?? 0) > 0;
  recordCheckpoint("rota-detalhe:antes-do-jsx-final");

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

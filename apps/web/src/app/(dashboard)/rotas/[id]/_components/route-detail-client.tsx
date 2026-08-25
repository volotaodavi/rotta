"use client";

import { useAuth } from "@rotta/auth/web";
import { Navigation } from "@rotta/icons";
import { buildNavigationUrl, detectNavigationApp } from "@rotta/maps/navigation";
import { RottaMap, type RottaMapMarker } from "@rotta/maps/web";
import { Badge, Button, Card, ErrorState, Spinner, Typography } from "@rotta/ui/web";
import { Suspense, useState } from "react";

import { RouteOptimizationSection } from "./route-optimization-section";
import { getStopDirection, STOP_DIRECTION_LABEL } from "./stop-direction";
import { StopsSection } from "./stops-section";
import { StudentsSection } from "./students-section";

import { RecenterButton } from "@/components/route-screen-chrome";
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
import { useMyLocation } from "@/hooks/use-my-location";
import { recordCheckpoint } from "@/lib/render-checkpoint";


interface RouteDetailClientProps {
  routeId: string;
}

/**
 * HISTÓRICO da investigação do "Server Components render"
 * indeterminístico em `/rotas/[id]` recém-criada (reproduzido 5+ vezes
 * ao vivo em produção, sempre a mesma conta Autônomo/MEI, sempre logo
 * após criar rota): duas hipóteses anteriores foram descartadas com
 * prova real, não suposição —
 *
 * 1. `use(params)` dentro de Client Component (o `page.tsx` original) —
 *    descartada: a página já foi convertida pra Server Component
 *    (`page.tsx` faz `await params`) e o incidente continuou.
 * 2. `{children}` do `(dashboard)/layout.tsx` mudando de wrapper quando
 *    o Modo Ação resolve depois do primeiro render — descartada: a
 *    correção foi publicada e o incidente reproduziu de novo, idêntico.
 *
 * CAUSA REAL capturada com o depurador do navegador pausando na
 * exceção real (não a redigida): `Error: Minified React error #460` —
 * "Suspense Exception: this is not a real error! It's an
 * implementation detail of `use` to interrupt the current render...
 * capturing without rethrowing will lead to unexpected behavior"
 * (https://react.dev/errors/460). Ou seja: um `use()` (do próprio
 * roteador do Next, não nosso — não sobra nenhum `use()` nosso nesta
 * rota) suspende, e o sinal interno do Suspense está sendo perdido
 * antes de chegar num `<Suspense>` de verdade. Não existia nenhum
 * `<Suspense>` explícito aqui — só o `SectionErrorBoundary` (Error
 * Boundary). Tentativa: parear o Error Boundary com um `<Suspense>`
 * explícito por dentro dele (padrão documentado do React pra evitar
 * exatamente esse tipo de sinal perdido) — se não resolver, a próxima
 * hipótese é incompatibilidade de versão entre Next 15.5.22 (que já
 * pode depender de semântica de `use()`/Suspense mais próxima da do
 * React 19) e o React 18.3.1 fixado neste projeto.
 */
export function RouteDetailClient({ routeId }: RouteDetailClientProps): JSX.Element {
  return (
    <SectionErrorBoundary label="pagina-rota-detalhe">
      <Suspense
        fallback={
          <div className="flex justify-center py-16">
            <Spinner size="lg" />
          </div>
        }
      >
        <RotaDetalheContent routeId={routeId} />
      </Suspense>
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
  // Localização atual do motorista (pedido do usuário: "para o motorista
  // ter uma ideia de onde é, principalmente a localização dele atual")
  // — mesmo `useMyLocation` já usado em "Minha Rota"/cadastro de aluno,
  // nunca enviada ao servidor, só orientação visual neste mapa.
  const { location: myLocation } = useMyLocation(true);
  recordCheckpoint("rota-detalhe:use-my-location-ok");
  // Botão "centralizar" (mesmo padrão de `/minha-rota`/`/alunos/[id]/mapa`) — `RottaMap` só lê `initialCenter`/`markers` na montagem, então recentralizar remonta com uma nova `key`.
  const [mapKey, setMapKey] = useState(0);

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

  const paradasOrdenadas = [...(stops ?? [])].sort((a, b) => a.ordem - b.ordem);

  /**
   * Mapa OpenStreet com o pino de cada parada + a localização atual do
   * motorista (pedido do usuário: "adicione o mapa da openstreet na
   * questão de criar rota, para o motorista ter uma ideia de onde é...
   * caso vincule mais alunos, deverá aparecer todos os pontos de
   * parada"). Rótulo de direção (Ida/Volta) direto no título do
   * marcador — mesma derivação de `getStopDirection` usada abaixo em
   * `StopsSection`.
   */
  const markers: RottaMapMarker[] = paradasOrdenadas.map((parada) => {
    const direction = getStopDirection(parada, routeStudents);
    return {
      id: parada.id,
      titulo: direction
        ? `${parada.ordem}. ${parada.endereco} · ${STOP_DIRECTION_LABEL[direction]}`
        : `${parada.ordem}. ${parada.endereco}`,
      latitude: parada.latitude,
      longitude: parada.longitude,
    };
  });
  const mapMarkers: RottaMapMarker[] = myLocation
    ? [
        ...markers,
        {
          id: "minha-localizacao",
          titulo: "Você está aqui",
          latitude: myLocation.latitude,
          longitude: myLocation.longitude,
        },
      ]
    : markers;

  // Botão "Navegar" único (pedido do usuário: "tudo no botão 'navegar'
  // único, para já ter as rotas para prosseguir") — mesmo deep-link
  // nativo (Apple/Google Maps) já usado em "Minha Rota"
  // (`ProximaParadaEtaCard`), aqui sempre mirando a PRIMEIRA parada da
  // rota (menor `ordem`) — esta tela não está numa viagem em curso
  // (sem ETA/posição do veículo pra saber "a próxima"), então o ponto de
  // partida natural é o começo do trajeto cadastrado.
  const primeiraParada = paradasOrdenadas[0];
  function handleNavegar(): void {
    if (!primeiraParada) return;
    const app = detectNavigationApp(navigator.userAgent);
    const url = buildNavigationUrl(
      { latitude: primeiraParada.latitude, longitude: primeiraParada.longitude },
      app,
    );
    window.open(url, "_blank", "noopener,noreferrer");
  }

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

      {/*
       * Mapa OpenStreet (pedido do usuário: "adicione o mapa da
       * openstreet na questão de criar rota, para o motorista ter uma
       * ideia de onde é — principalmente a localização dele atual...
       * caso vincule mais alunos, deverá aparecer todos os pontos de
       * parada") — mesmo cartão compacto (não tela cheia) já usado em
       * `/minha-rota` e `/alunos/[id]/mapa`. Um único botão "Navegar"
       * (pedido do usuário: "tudo no botão 'navegar' único, para já ter
       * as rotas para prosseguir") reaproveita o mesmo deep-link nativo
       * (Google/Apple Maps) já usado em "Minha Rota" — sem repetir um
       * botão por parada.
       */}
      {mapMarkers.length > 0 ? (
        <Card className="overflow-hidden">
          <div className="relative h-52 w-full">
            <RottaMap key={mapKey} markers={mapMarkers} initialZoom={13} />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-end p-2">
              <RecenterButton onClick={() => setMapKey((k) => k + 1)} />
            </div>
          </div>
          {primeiraParada ? (
            <Card.Body className="flex items-center justify-between gap-3">
              <Typography variant="bodySmall" color="muted">
                {paradasOrdenadas.length}{" "}
                {paradasOrdenadas.length === 1 ? "parada cadastrada" : "paradas cadastradas"}
              </Typography>
              <Button
                variant="secondary"
                size="sm"
                iconLeft={<Navigation size={16} />}
                onClick={handleNavegar}
              >
                Navegar
              </Button>
            </Card.Body>
          ) : null}
        </Card>
      ) : null}

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
        <StopsSection
          routeId={routeId}
          stops={stops}
          routeStudents={routeStudents}
          isLoading={isLoadingStops}
        />
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

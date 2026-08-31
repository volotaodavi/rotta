"use client";

import { Check, LogIn, LogOut, MapPin, UserX } from "@rotta/icons";
import {
  estaProximo,
  haversineDistanceMeters,
  type DistanceCoordenada,
} from "@rotta/maps/distance";
import { type RottaMapMarker } from "@rotta/maps/types";
import { Badge, Button, Card, ErrorState, Spinner, Typography } from "@rotta/ui/web";
import { useState } from "react";

import type { RouteStop, RouteStudent, TripStudentEventType } from "@rotta/api-client";

import { RottaMapLazy as RottaMap } from "@/components/rotta-map-lazy";
import { RecenterButton, RouteFromToCard } from "@/components/route-screen-chrome";
import { SlideToAction } from "@/components/slide-to-action";
import {
  useAddStudentEvent,
  useFinishTrip,
  useStartTrip,
  useTodayTrip,
} from "@/features/driver/hooks/use-driver-trip";
import { useTripGpsReporting } from "@/features/driver/hooks/use-trip-gps-reporting";
import { TRIP_STATUS_BADGE } from "@/features/driver/trip-status";
import { useGpsTrack } from "@/features/gps/hooks/use-gps";
import { useNextStopTracedRoute } from "@/features/gps/hooks/use-next-stop-traced-route";
import { useRoute, useRouteStops, useRouteStudents } from "@/features/routes/hooks/use-routes";
import { ROUTE_STATUS_LABEL } from "@/features/routes/labels";
import { useStudent } from "@/features/students/hooks/use-students";
import {
  useStudentsAttendanceToday,
  useTripProximasEtas,
  useTripStudentEvents,
} from "@/features/trips/hooks/use-trips";
import { useVehicle } from "@/features/vehicles/hooks/use-vehicles";

/**
 * Extraído de `executar/page.tsx` pra aceitar `routeId`/`onVoltar` como
 * props (em vez de ler `useParams()` direto) — ver a nota grande em
 * `rotas/page.tsx` sobre por que "Minhas Rotas" passou a montar isto
 * embutido, sem navegar pra este segmento dinâmico. `executar/page.tsx`
 * continua existindo e funcionando normalmente pra quem chega direto
 * por um link salvo/compartilhado.
 */
export function ExecuteRouteClient({
  routeId,
  onVoltar,
}: {
  routeId: string;
  onVoltar: () => void;
}): JSX.Element {
  const {
    data: route,
    isLoading: isLoadingRoute,
    isError: isRouteError,
    refetch: refetchRoute,
    isFetching: isFetchingRoute,
  } = useRoute(routeId);
  const { data: stops } = useRouteStops(routeId);
  const { data: routeStudents } = useRouteStudents(routeId);
  const { data: trip, isLoading: isLoadingTrip } = useTodayTrip(routeId);
  const { data: studentEvents } = useTripStudentEvents(trip?.id);
  const { data: veiculoPadrao } = useVehicle(route?.veiculoPadraoId ?? "");

  const startTrip = useStartTrip(routeId);
  const finishTrip = useFinishTrip(routeId);

  const isActive = trip?.status === "EM_ANDAMENTO";
  const { status: gpsStatus } = useTripGpsReporting(isActive && trip ? trip.id : null);
  // Frente 7 (prevenção de riscos, vazamentos e erros): nunca falha
  // silenciosamente sobre a localização — mesmo texto/estado já
  // comprovado em `/minha-rota`.
  const gpsAvisoTexto =
    gpsStatus === "reporting"
      ? "Compartilhando sua localização com os responsáveis."
      : gpsStatus === "requesting"
        ? "Solicitando permissão de localização…"
        : gpsStatus === "denied"
          ? "Localização negada pelo navegador. Permita o acesso (ícone de cadeado na barra de endereço) para os botões de embarque/desembarque liberarem pelo raio de 1km."
          : null;

  const paradasOrdenadas = [...(stops ?? [])].sort((a, b) => a.ordem - b.ordem);
  const stopsById = new Map(paradasOrdenadas.map((stop) => [stop.id, stop]));

  // Alunos cuja parada de EMBARQUE é uma escola (`schoolId` presente) —
  // sinal de que esta é a "volta". Só pra esses consulta a presença de
  // hoje (ver nota da função acima).
  const alunosVoltaIds = (routeStudents ?? [])
    .filter((aluno) => stopsById.get(aluno.paradaEmbarqueId)?.schoolId)
    .map((aluno) => aluno.studentId);
  const { data: attendanceToday } = useStudentsAttendanceToday(alunosVoltaIds);
  const ausentesHojeIds = new Set(
    (attendanceToday ?? []).filter((a) => a.ausenteHoje).map((a) => a.studentId),
  );

  const gpsTrackTripId =
    trip && trip.status !== "FINALIZADA" && trip.status !== "CANCELADA" ? trip.id : undefined;
  const { data: gpsTrack } = useGpsTrack(gpsTrackTripId);
  const ultimaPosicao = gpsTrack && gpsTrack.length > 0 ? gpsTrack[gpsTrack.length - 1] : undefined;
  const driverPosition: DistanceCoordenada | null = ultimaPosicao
    ? { latitude: ultimaPosicao.latitude, longitude: ultimaPosicao.longitude }
    : null;

  const markers: RottaMapMarker[] = paradasOrdenadas.map((parada) => ({
    id: parada.id,
    titulo: `${parada.ordem}. ${parada.endereco}`,
    latitude: parada.latitude,
    longitude: parada.longitude,
  }));
  const veiculoMarker: RottaMapMarker | null = ultimaPosicao
    ? {
        id: "veiculo-em-movimento",
        titulo: veiculoPadrao ? `${veiculoPadrao.modelo} · ${veiculoPadrao.placa}` : "Seu veículo",
        latitude: ultimaPosicao.latitude,
        longitude: ultimaPosicao.longitude,
        emMovimento: true,
      }
    : null;
  const mapMarkers = veiculoMarker ? [...markers, veiculoMarker] : markers;

  // Linha azul de verdade até a próxima parada pendente (pedido do
  // usuário: "a linha azul é igual GPS mesmo") — mesmo hook usado em
  // `/minha-rota`; sem viagem ativa ou sem ETA ainda, cai pro traçado
  // estático de todas as paradas (comportamento de sempre desta tela).
  const { data: proximasEtas } = useTripProximasEtas(isActive && trip ? trip.id : undefined);
  const proximaEta = proximasEtas?.[0];
  const tracedRoute = useNextStopTracedRoute(
    driverPosition,
    proximaEta ? { latitude: proximaEta.latitude, longitude: proximaEta.longitude } : null,
  );
  const rotaTracada =
    tracedRoute.route ??
    paradasOrdenadas.map((p) => ({ latitude: p.latitude, longitude: p.longitude }));

  const [mapKey, setMapKey] = useState(0);

  if (isLoadingRoute) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isRouteError || !route) {
    return (
      <ErrorState
        message="Não foi possível carregar esta rota."
        onRetry={() => void refetchRoute()}
        isRetrying={isFetchingRoute}
      />
    );
  }

  const viagemEncerrada = trip && (trip.status === "FINALIZADA" || trip.status === "CANCELADA");
  const primeiraParada = paradasOrdenadas[0];
  const ultimaParada = paradasOrdenadas[paradasOrdenadas.length - 1];

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <Typography variant="title">{route.nome}</Typography>
          <Typography variant="bodySmall" color="muted">
            {ROUTE_STATUS_LABEL[route.status]}
          </Typography>
        </div>
        {trip ? (
          <Badge variant={TRIP_STATUS_BADGE[trip.status]?.variant ?? "neutral"}>
            {TRIP_STATUS_BADGE[trip.status]?.label ?? trip.status}
          </Badge>
        ) : null}
      </div>

      <Card className="overflow-hidden">
        <div className="relative h-64 w-full">
          {markers.length > 0 ? (
            <RottaMap key={mapKey} markers={mapMarkers} route={rotaTracada} initialZoom={12} />
          ) : (
            <div className="flex h-full items-center justify-center bg-card">
              <Typography variant="bodySmall" color="muted">
                Nenhuma parada cadastrada nesta rota ainda.
              </Typography>
            </div>
          )}
          {primeiraParada && ultimaParada ? (
            <RouteFromToCard
              onVoltar={onVoltar}
              origemLabel={`1. ${primeiraParada.endereco}`}
              destinoLabel={`${ultimaParada.ordem}. ${ultimaParada.endereco}`}
            />
          ) : null}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-end p-2">
            <RecenterButton onClick={() => setMapKey((k) => k + 1)} />
          </div>
        </div>
      </Card>

      {isActive && gpsAvisoTexto ? (
        <Typography variant="caption" color="muted">
          {gpsAvisoTexto}
        </Typography>
      ) : null}

      <div className="flex flex-col gap-2">
        {isLoadingTrip ? (
          <div className="flex justify-center py-2">
            <Spinner size="md" />
          </div>
        ) : !trip ? (
          <SlideToAction
            label="Deslize para iniciar a rota"
            onComplete={() => startTrip.mutate({ routeId })}
            isLoading={startTrip.isPending}
          />
        ) : viagemEncerrada ? (
          <Typography variant="bodySmall" color="muted" className="py-2 text-center">
            A viagem de hoje já foi {trip.status === "FINALIZADA" ? "finalizada" : "cancelada"}.
          </Typography>
        ) : (
          <SlideToAction
            label="Deslize para finalizar"
            onComplete={() => finishTrip.mutate(trip.id)}
            isLoading={finishTrip.isPending}
            danger
          />
        )}
      </div>

      {trip && !viagemEncerrada
        ? paradasOrdenadas.map((parada) => (
            <ParadaExecucaoCard
              key={parada.id}
              parada={parada}
              alunos={(routeStudents ?? []).filter(
                (aluno) =>
                  aluno.paradaEmbarqueId === parada.id || aluno.paradaDesembarqueId === parada.id,
              )}
              eventos={studentEvents ?? []}
              tripId={trip.id}
              podeOperar={isActive}
              driverPosition={driverPosition}
              ausentesHojeIds={ausentesHojeIds}
            />
          ))
        : null}
    </div>
  );
}

function ParadaExecucaoCard({
  parada,
  alunos,
  eventos,
  tripId,
  podeOperar,
  driverPosition,
  ausentesHojeIds,
}: {
  parada: RouteStop;
  alunos: RouteStudent[];
  eventos: { studentId: string; tipo: TripStudentEventType }[];
  tripId: string;
  podeOperar: boolean;
  driverPosition: DistanceCoordenada | null;
  ausentesHojeIds: Set<string>;
}): JSX.Element {
  return (
    <Card>
      <Card.Body className="flex flex-col gap-3">
        <div className="flex items-start gap-2">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-text-muted" />
          <div>
            <Typography variant="bodySmall">
              {parada.ordem}. {parada.endereco}
            </Typography>
            <Typography variant="caption" color="muted">
              Previsto: {parada.horarioPrevisto}
            </Typography>
          </div>
        </div>

        {alunos.length === 0 ? (
          <Typography variant="caption" color="muted">
            Nenhum aluno embarca/desembarca aqui.
          </Typography>
        ) : (
          alunos.map((aluno) => (
            <AlunoParadaExecRow
              key={aluno.id}
              aluno={aluno}
              parada={parada}
              eventos={eventos}
              tripId={tripId}
              podeOperar={podeOperar}
              driverPosition={driverPosition}
              faltouHoje={
                aluno.paradaEmbarqueId === parada.id && ausentesHojeIds.has(aluno.studentId)
              }
            />
          ))
        )}
      </Card.Body>
    </Card>
  );
}

function AlunoParadaExecRow({
  aluno,
  parada,
  eventos,
  tripId,
  podeOperar,
  driverPosition,
  faltouHoje,
}: {
  aluno: RouteStudent;
  parada: RouteStop;
  eventos: { studentId: string; tipo: TripStudentEventType }[];
  tripId: string;
  podeOperar: boolean;
  driverPosition: DistanceCoordenada | null;
  faltouHoje: boolean;
}): JSX.Element {
  const { data: student } = useStudent(aluno.studentId);
  const addEvent = useAddStudentEvent(tripId);
  const [confirmandoAusencia, setConfirmandoAusencia] = useState(false);

  const isEmbarque = aluno.paradaEmbarqueId === parada.id;
  const tipo: TripStudentEventType = isEmbarque ? "EMBARCOU" : "DESEMBARCOU";
  const jaEmbarcou = eventos.some((e) => e.studentId === aluno.studentId && e.tipo === "EMBARCOU");
  const jaOcorreu = eventos.some((e) => e.studentId === aluno.studentId && e.tipo === tipo);
  const jaAusente = eventos.some((e) => e.studentId === aluno.studentId && e.tipo === "AUSENTE");

  // Gate de proximidade (pedido do usuário: "ao chegar próximo — um
  // raio de até 1km — poderá embarcar/desembarcar o aluno daquela
  // localidade"). Sem posição ainda conhecida, `estaProximo` responde
  // `true` — nunca trava o motorista só por o GPS ainda não ter
  // reportado nada.
  const paradaCoordenada: DistanceCoordenada = {
    latitude: parada.latitude,
    longitude: parada.longitude,
  };
  const distanciaMetros = driverPosition
    ? haversineDistanceMeters(driverPosition, paradaCoordenada)
    : null;
  const perto = estaProximo(driverPosition, paradaCoordenada);
  const elegivel = !jaOcorreu && !jaAusente && !faltouHoje && (isEmbarque || jaEmbarcou);
  const podeRegistrar = podeOperar && elegivel && perto;
  const longeDemais = podeOperar && elegivel && !perto;

  if (isEmbarque && faltouHoje) {
    return (
      <div className="flex items-center justify-between gap-3 border-t border-border pt-3 first:border-t-0 first:pt-0">
        <Typography variant="bodySmall" color="muted">
          {student?.nome ?? "Carregando…"}
        </Typography>
        <Typography variant="caption" color="muted">
          Não foi à escola hoje
        </Typography>
      </div>
    );
  }

  return (
    // Epic C (Responsável marcou "meu filho não vai hoje" — ou o
    // motorista/monitor confirmou a ausência): pedido literal do usuário
    // ("o aluno vai ficar meio opaco") — a linha INTEIRA fica esmaecida,
    // não só o texto do botão trocado por "Ausente".
    <div
      className={`flex flex-col gap-1.5 border-t border-border pt-3 first:border-t-0 first:pt-0${
        jaAusente ? " opacity-50" : ""
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <Typography variant="bodySmall">
          {isEmbarque ? "Embarque" : "Desembarque"}: {student?.nome ?? "Carregando…"}
        </Typography>
        {jaOcorreu ? (
          <Check className="h-[18px] w-[18px] text-success" />
        ) : jaAusente ? (
          <Typography variant="caption" className="text-danger">
            Ausente
          </Typography>
        ) : confirmandoAusencia && isEmbarque ? (
          <button
            type="button"
            className="text-xs font-semibold text-danger hover:underline"
            onClick={() =>
              addEvent.mutate(
                { studentId: aluno.studentId, tipo: "AUSENTE" },
                { onSuccess: () => setConfirmandoAusencia(false) },
              )
            }
          >
            Confirmar ausência
          </button>
        ) : (
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant={isEmbarque ? "primary" : "danger"}
              size="sm"
              iconLeft={isEmbarque ? <LogIn size={16} /> : <LogOut size={16} />}
              isDisabled={!podeRegistrar}
              isLoading={addEvent.isPending}
              onClick={() => addEvent.mutate({ studentId: aluno.studentId, tipo })}
            >
              {isEmbarque ? "Embarque" : "Desembarque"}
            </Button>
            {isEmbarque ? (
              <button
                type="button"
                aria-label="Marcar ausência"
                disabled={!podeOperar}
                onClick={() => setConfirmandoAusencia(true)}
                className="text-danger disabled:opacity-40"
              >
                <UserX size={20} />
              </button>
            ) : null}
          </div>
        )}
      </div>
      {longeDemais ? (
        <Typography variant="caption" color="muted">
          Aproxime-se até 1km do local para liberar o botão
          {distanciaMetros !== null ? ` (você está a ${formatarDistancia(distanciaMetros)})` : ""}.
        </Typography>
      ) : null}
    </div>
  );
}

function formatarDistancia(metros: number): string {
  if (metros < 1000) return `${Math.round(metros)}m`;
  return `${(metros / 1000).toFixed(1).replace(".", ",")}km`;
}

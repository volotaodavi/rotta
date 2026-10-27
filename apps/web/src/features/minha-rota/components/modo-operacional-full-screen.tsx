"use client";

import { Check, ChevronDown, ChevronUp, Navigation, Pause, Play, Users } from "@rotta/icons";
import { haversineDistanceMeters, type DistanceCoordenada } from "@rotta/maps/distance";
import { buildNavigationUrl, detectNavigationApp } from "@rotta/maps/navigation";
import { isCoordenadaValida, type RottaMapMarker } from "@rotta/maps/types";
import { Button, Spinner, Typography } from "@rotta/ui/web";
import { useState } from "react";

import type {
  useFinishTrip,
  usePauseTrip,
  useResumeTrip,
} from "@/features/driver/hooks/use-driver-trip";
import type { RoleAccent } from "@/features/minha-rota/labels";
import type {
  NextEta,
  Route,
  RouteStop,
  RouteStudent,
  Trip,
  TripStudentEventType,
} from "@rotta/api-client";
import type { ReactNode } from "react";

import { RottaMapLazy as RottaMap } from "@/components/rotta-map-lazy";
import { RecenterButton } from "@/components/route-screen-chrome";
import { SlideToAction } from "@/components/slide-to-action";
import { useNextStopTracedRoute } from "@/features/gps/hooks/use-next-stop-traced-route";
import { AlunoParadaRow, ParadaCard } from "@/features/minha-rota/components/parada-card";
import { RegistrarOcorrenciaButton } from "@/features/minha-rota/components/registrar-ocorrencia-button";
import { TripElapsedTimer } from "@/features/minha-rota/components/trip-elapsed-timer";
import { formatarDistancia } from "@/features/minha-rota/labels";
import { useStudentsAttendanceToday } from "@/features/trips/hooks/use-trips";

/**
 * Frente AP — tela cheia do Modo Ação depois que a viagem existe (pedido
 * detalhado do usuário: "o mapa inteiro na tela, literalmente o mapa
 * inteiro... um retângulo com borda redonda flutuante... com os alunos,
 * com um botão do lado - azul (embarque), vermelho (desembarque)...
 * mostra a próxima rota traçada... quando todos, a próxima rota será a
 * escola"). Reaproveita tudo que já existia (nunca duplicado): `estaProximo`/
 * raio de 1km e o próprio botão embarque/desembarque vêm de
 * `AlunoParadaRow`; a "próxima parada" real (com ETA por rota OSRM,
 * reordenada por proximidade real do veículo) vem de `useTripProximasEtas`
 * (já existia, só nunca tinha virado o alvo visual do mapa). A escola é só
 * a ÚLTIMA parada pendente na mesma lista — nenhuma regra nova precisou
 * ser escrita pra "ir pra escola no final": quando só sobra desembarque,
 * é a própria `computeProximasEtas` do backend que aponta pra lá.
 */
export function ModoOperacionalFullScreen({
  rota,
  trip,
  accent,
  isMotorista,
  isActive,
  mapMarkers,
  paradasOrdenadas,
  driverPosition,
  routeStudents,
  studentEvents,
  proximasEtas,
  alunosEmbarcados,
  totalAlunos,
  gpsAvisoTexto,
  pauseTrip,
  resumeTrip,
  finishTrip,
  mapKey,
  onRecenter,
}: {
  rota: Route;
  trip: Trip;
  accent: RoleAccent;
  isMotorista: boolean;
  isActive: boolean;
  mapMarkers: RottaMapMarker[];
  paradasOrdenadas: RouteStop[];
  driverPosition: DistanceCoordenada | null;
  routeStudents: RouteStudent[];
  studentEvents: { studentId: string; tipo: TripStudentEventType }[];
  proximasEtas: NextEta[];
  alunosEmbarcados: number;
  totalAlunos: number;
  gpsAvisoTexto: string | null;
  pauseTrip: ReturnType<typeof usePauseTrip>;
  resumeTrip: ReturnType<typeof useResumeTrip>;
  finishTrip: ReturnType<typeof useFinishTrip>;
  mapKey: number;
  onRecenter: () => void;
}): JSX.Element {
  // "IA de continuidade" ida→volta (pedido do usuário: "se o aluno ficou
  // ausente na rota de ida, na volta aparecerá como ausente ou o
  // transportador pode colocar que ele foi embarcado" — decisão
  // confirmada: sugestão de 1 toque, NUNCA registra nada sozinho).
  // Heurística de "isto é a volta": a parada de EMBARQUE deste aluno é a
  // própria escola (`schoolId` presente) — mesmo critério já usado antes
  // em `execute-route-client.tsx`, só que ali a linha inteira era
  // escondida sem deixar o motorista embarcar mesmo assim. Aqui os dois
  // botões continuam disponíveis; `ausentesHojeIds` só liga um AVISO em
  // `AlunoParadaRow`. Backend já existente (`GET students-attendance-today`,
  // cross-trip, mesmo dia, mesma empresa) — nenhuma mudança de API.
  const stopsById = new Map(paradasOrdenadas.map((parada) => [parada.id, parada]));
  const alunosVoltaIds = routeStudents
    .filter((aluno) => stopsById.get(aluno.paradaEmbarqueId)?.schoolId)
    .map((aluno) => aluno.studentId);
  const { data: attendanceToday } = useStudentsAttendanceToday(alunosVoltaIds);
  const ausentesHojeIds = new Set(
    (attendanceToday ?? []).filter((a) => a.ausenteHoje).map((a) => a.studentId),
  );

  // Mesmo filtro de "falta o evento esperado" usado em `paradasRestantesCount`
  // e em `ParadaCard` (duplicado de propósito — três lugares, uma regra só).
  const paradasPendentes = paradasOrdenadas.filter((parada) => {
    const alunosDaParada = routeStudents.filter(
      (aluno) => aluno.paradaEmbarqueId === parada.id || aluno.paradaDesembarqueId === parada.id,
    );
    if (alunosDaParada.length === 0) return false;
    return alunosDaParada.some((aluno) => {
      const isEmbarque = aluno.paradaEmbarqueId === parada.id;
      const tipoEsperado: TripStudentEventType = isEmbarque ? "EMBARCOU" : "DESEMBARCOU";
      const resolvido = studentEvents.some(
        (e) => e.studentId === aluno.studentId && (e.tipo === tipoEsperado || e.tipo === "AUSENTE"),
      );
      return !resolvido;
    });
  });

  // ETA real (Rotta AI de proximidade, `computeProximasEtas` no backend)
  // quando o GPS já reportou alguma posição; sem isso ainda — viagem
  // recém-iniciada ou `PAUSADA` — cai pra ordem cadastrada, nunca deixa o
  // cartão vazio à toa.
  const proximaEta = proximasEtas[0];
  const paradaAlvo = proximaEta
    ? (paradasOrdenadas.find((p) => p.id === proximaEta.routeStopId) ?? paradasPendentes[0])
    : paradasPendentes[0];

  const alunosDaParadaAlvo = paradaAlvo
    ? routeStudents.filter(
        (aluno) =>
          aluno.paradaEmbarqueId === paradaAlvo.id || aluno.paradaDesembarqueId === paradaAlvo.id,
      )
    : [];

  const chegouNaEscola =
    alunosDaParadaAlvo.length > 0 &&
    alunosDaParadaAlvo.every((aluno) => aluno.paradaDesembarqueId === paradaAlvo?.id);

  // Coordenada real de "pra onde ir agora" — usa a do próprio `proximaEta`
  // quando disponível (já vem certa mesmo quando o aluno tem um desvio de
  // endereço ativo hoje, ver `TripsService.listPendenciasPorAluno`); cai
  // pro endereço fixo da parada (`paradaAlvo`) só quando o ETA recalculado
  // ainda não chegou (viagem recém-iniciada, sem GPS). `isCoordenadaValida`
  // é a mesma rede de segurança do `RottaMap` (`@rotta/maps`) contra dado
  // de parada mal geocodificado (endereço "0. D, 0", latitude/longitude
  // 0/0 — "Null Island" — auditoria 27/08/2026): sem isso, `destinoAlvo`
  // levava a coordenada crua da parada direto pro mapa, pro cálculo de
  // distância E pro botão "Navegar", ignorando o `resolverPendencia` que
  // já filtra isso no backend quando `proximaEta` existe.
  const destinoBruto = proximaEta
    ? { latitude: proximaEta.latitude, longitude: proximaEta.longitude }
    : paradaAlvo
      ? { latitude: paradaAlvo.latitude, longitude: paradaAlvo.longitude }
      : null;
  const destinoAlvo = destinoBruto && isCoordenadaValida(destinoBruto) ? destinoBruto : null;

  // "Próxima rota traçada" (pedido do usuário: "a linha azul é igual GPS
  // mesmo") — veículo → destino-alvo, seguindo as ruas de verdade (OSRM via
  // Rotta Geo Engine), não mais uma linha reta ligando os dois pontos.
  // Enquanto o traçado real ainda não chegou (primeiro carregamento) ou o
  // OSRM falha, cai pra linha reta como respaldo — nunca deixa o mapa sem
  // nenhuma indicação de "pra onde ir agora".
  const tracedRoute = useNextStopTracedRoute(driverPosition, destinoAlvo);
  const rotaTracada =
    tracedRoute.route ??
    (destinoAlvo && driverPosition
      ? [driverPosition, destinoAlvo]
      : paradasOrdenadas.map((p) => ({ latitude: p.latitude, longitude: p.longitude })));

  const distanciaAteAlvo =
    driverPosition && destinoAlvo ? haversineDistanceMeters(driverPosition, destinoAlvo) : null;

  function handleNavegar(): void {
    if (!destinoAlvo) return;
    const app = detectNavigationApp(navigator.userAgent);
    const url = buildNavigationUrl(destinoAlvo, app);
    window.open(url, "_blank", "noopener,noreferrer");
  }

  // Pedido do usuário: "a lista de alunos deverá aparecer completa
  // durante a viagem, não somente o da parada atual" — o cartão
  // continua abrindo focado só na PRÓXIMA parada (é o que importa pra
  // agir agora), mas esse botão revela a rota inteira, parada por
  // parada, com todos os alunos e o status de cada um.
  const [verTodosAlunos, setVerTodosAlunos] = useState(false);

  return (
    // `z-10` (não `z-modal`) — auditoria 27/08/2026, pedido do usuário:
    // "mesmo a rota ativa, o usuário poderá navegar pelo app/web, ficar
    // fixado no mapa não é eficaz". Antes usava `z-modal` (1300), muito
    // acima do `z-20` do `PortalBottomNav`/`DriverBottomNav` — cobria
    // literalmente a barra de navegação inferior (fixa, mesma
    // `position: fixed`) durante toda viagem ativa, tornando os 4 ícones
    // (Início/Viagens/Notificações/Perfil) invisíveis E inclicáveis. A
    // experiência de mapa em tela cheia continua idêntica (`inset-0`
    // preenche a viewport inteira) — só a ORDEM de empilhamento muda,
    // pra a barra sempre pintar por cima e continuar tocável.
    <div className="fixed inset-0 z-10 flex flex-col bg-background">
      <div className="relative flex-1">
        {mapMarkers.length > 0 ? (
          <RottaMap
            key={mapKey}
            markers={mapMarkers}
            route={rotaTracada}
            initialZoom={13}
            // "Mapa em modo GPS" (Frente 4, pedido do usuário: "deverá
            // também ficar de olho... podendo centralizar o mapa de
            // acordo com a rota do veículo") — a câmera acompanha o
            // próprio veículo enquanto o motorista/monitor dirige.
            followMode
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Spinner size="lg" />
          </div>
        )}

        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3">
          <div className="pointer-events-auto flex items-center gap-2 rounded-full bg-surface-elevated/95 px-4 py-2 shadow-lg backdrop-blur">
            <span
              className={`h-2 w-2 shrink-0 rounded-full ${isActive ? accent.bg : "bg-text-muted"}`}
            />
            <Typography variant="bodySmall" className="max-w-[10rem] truncate font-semibold">
              {rota.nome}
            </Typography>
            <TripElapsedTimer iniciadaEm={trip.iniciadaEm} isRunning={isActive} accent={accent} />
          </div>
          <div className="pointer-events-auto flex items-center gap-2">
            <RecenterButton onClick={onRecenter} />
          </div>
        </div>

        {gpsAvisoTexto ? (
          <div className="pointer-events-none absolute inset-x-3 top-16 flex justify-center">
            <Typography
              variant="caption"
              color="muted"
              className="pointer-events-auto max-w-xs rounded-full bg-surface-elevated/95 px-3 py-1 text-center shadow backdrop-blur"
            >
              {gpsAvisoTexto}
            </Typography>
          </div>
        ) : null}
      </div>

      <OperationalBottomSheet expanded={verTodosAlunos}>
        <div className="flex items-center justify-between gap-2 pb-3">
          <button
            type="button"
            onClick={() => setVerTodosAlunos((v) => !v)}
            className="flex items-center gap-1.5 text-text-muted"
          >
            <Users size={14} />
            <Typography variant="caption" color="muted">
              {alunosEmbarcados}/{totalAlunos} embarcados ·{" "}
              {verTodosAlunos ? "ocultar todos os alunos" : "ver todos os alunos"}
            </Typography>
            {verTodosAlunos ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          </button>
          <div className="flex shrink-0 items-center gap-2">
            {/* Pedido do usuário: "o botão de pausar rota deverá sair de
                onde está, pois ele está muito difícil de ser clicado" —
                antes era um círculo de 44px flutuando por cima do mapa,
                disputando toque com os gestos de arrastar/zoom do próprio
                mapa. Movido pra dentro do cartão (mesma fileira do botão
                de ocorrência), como botão normal com rótulo — alvo de
                toque bem maior e sem concorrer com o mapa. */}
            {isMotorista ? (
              <Button
                variant="secondary"
                size="sm"
                iconLeft={isActive ? <Pause size={16} /> : <Play size={16} />}
                onClick={() => (isActive ? pauseTrip.mutate(trip.id) : resumeTrip.mutate(trip.id))}
                isLoading={pauseTrip.isPending || resumeTrip.isPending}
              >
                {isActive ? "Pausar" : "Retomar"}
              </Button>
            ) : null}
            <RegistrarOcorrenciaButton veiculoId={trip.veiculoId} accent={accent} />
          </div>
        </div>

        {paradaAlvo ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-start justify-between gap-3 border-t border-border pt-3">
              <div className="min-w-0">
                <Typography variant="caption" color="muted">
                  {chegouNaEscola ? "Próximo destino · Escola" : "Próxima parada"}
                </Typography>
                <Typography variant="bodySmall" className="font-semibold leading-tight">
                  {/* `proximaEta.endereco` já vem certo mesmo num dia com desvio
                      de endereço ativo (o texto formatado do próprio desvio,
                      não o da parada física de sempre) — só cai pro endereço
                      fixo da parada quando o ETA ainda não chegou. */}
                  {proximaEta ? proximaEta.endereco : `${paradaAlvo.ordem}. ${paradaAlvo.endereco}`}
                </Typography>
                {proximaEta ? (
                  <Typography variant="caption" color="muted">
                    {new Date(proximaEta.etaPrevista).toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}{" "}
                    · {formatarDistancia(proximaEta.distanciaMetros)}
                  </Typography>
                ) : distanciaAteAlvo !== null ? (
                  <Typography variant="caption" color="muted">
                    {formatarDistancia(distanciaAteAlvo)}
                  </Typography>
                ) : null}
              </div>
              <Button
                variant="secondary"
                size="sm"
                iconLeft={<Navigation size={16} />}
                onClick={handleNavegar}
                className="shrink-0"
              >
                Navegar
              </Button>
            </div>

            <div className="flex flex-col">
              {alunosDaParadaAlvo.map((aluno) => (
                <AlunoParadaRow
                  key={aluno.id}
                  aluno={aluno}
                  parada={paradaAlvo}
                  eventos={studentEvents}
                  tripId={trip.id}
                  podeOperar={isActive}
                  driverPosition={driverPosition}
                  ausenteNaIdaHoje={ausentesHojeIds.has(aluno.studentId)}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 border-t border-border py-4 text-center">
            <Check size={28} className="text-success" />
            <Typography variant="bodySmall" className="font-semibold">
              Todos os alunos foram desembarcados.
            </Typography>
            {isMotorista ? (
              <div className="w-full pt-2">
                <SlideToAction
                  label="Deslize para finalizar"
                  onComplete={() => finishTrip.mutate(trip.id)}
                  isLoading={finishTrip.isPending}
                  danger
                />
              </div>
            ) : (
              <Typography variant="caption" color="muted">
                Aguardando o motorista finalizar a viagem.
              </Typography>
            )}
          </div>
        )}

        {verTodosAlunos ? (
          <div className="flex flex-col gap-3 border-t border-border pt-3">
            <Typography variant="caption" color="muted">
              Todas as paradas da rota
            </Typography>
            {paradasOrdenadas.map((parada) => (
              <ParadaCard
                key={parada.id}
                parada={parada}
                alunos={routeStudents.filter(
                  (aluno) =>
                    aluno.paradaEmbarqueId === parada.id || aluno.paradaDesembarqueId === parada.id,
                )}
                eventos={studentEvents}
                tripId={trip.id}
                podeOperar={isActive}
                driverPosition={driverPosition}
                ausentesHojeIds={ausentesHojeIds}
              />
            ))}
          </div>
        ) : null}
      </OperationalBottomSheet>
    </div>
  );
}

/**
 * Cartão ANCORADO por cima do mapa em tela cheia — paridade com
 * `OperationalBottomSheet` do app nativo (`inicio-screen.tsx`, mesma
 * spec de identidade do Motorista/Monitor, 31/08/2026). Antes era um
 * `DraggableFloatingCard` de arrasto livre nas duas direções; trocado
 * por dois estados fixos de altura (colapsado/expandido, mesmos ~63%/
 * 88% do nativo) alternados pelo botão "ver todos os alunos" — nunca
 * mais "perdido" no meio da tela nem sobre a barra de navegação
 * (`BOTTOM_NAV_RESERVE_PX` deixa de ser necessário: a folha fica sempre
 * ancorada no rodapé, dentro da área reservada pelo `z-10` do wrapper).
 * `bottom-20` (80px) reserva o mesmo espaço que o antigo
 * `BOTTOM_NAV_RESERVE_PX` calculava em JS — aqui é só CSS, porque a
 * folha não se move mais por coordenada arbitrária.
 */
export function OperationalBottomSheet({
  children,
  expanded,
}: {
  children: ReactNode;
  expanded: boolean;
}): JSX.Element {
  return (
    <div
      className={`fixed inset-x-0 bottom-20 z-10 mx-auto flex w-full flex-col overflow-hidden rounded-3xl border border-border bg-surface shadow-driver transition-[max-height] duration-300 ease-in-out sm:inset-x-4 sm:mx-auto sm:max-w-md ${
        expanded ? "max-h-[88vh]" : "max-h-[63vh]"
      }`}
    >
      <div aria-hidden="true" className="flex shrink-0 items-center justify-center py-2">
        <div className="h-1.5 w-10 rounded-full bg-border" />
      </div>
      <div className="flex-1 overflow-y-auto px-4 pb-4">{children}</div>
    </div>
  );
}

/** "350m"/"1,2km" — mesmo padrão de arredondamento visual usado nos cartões de ETA (nunca mais de uma casa decimal). */

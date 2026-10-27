"use client";

// `ROT-07` — `ordenarParadasPorSentido` mora em `@rotta/api-client`
// (`rules/paradas.ts`) desde 19/09/2026, compartilhado com o aplicativo.
import { ordenarParadasPorSentido } from "@rotta/api-client";
import { useAuth } from "@rotta/auth/web";
import { AlertTriangle, Pause, Play } from "@rotta/icons";
import { type DistanceCoordenada } from "@rotta/maps/distance";
import { type RottaMapMarker } from "@rotta/maps/types";
import {
  Badge,
  Button,
  Card,
  Modal,
  PanelGreeting,
  Select,
  Spinner,
  Typography,
  buttonVariants,
  useToast,
} from "@rotta/ui/web";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import type { Route, TripSentido, TripStudentEventType } from "@rotta/api-client";

import { RottaMapLazy as RottaMap } from "@/components/rotta-map-lazy";
import { RecenterButton } from "@/components/route-screen-chrome";
import { SlideToAction } from "@/components/slide-to-action";
import { useBeforeUnloadWarning } from "@/features/driver/hooks/use-before-unload-warning";
import {
  useRouteStops,
  useRouteStudents,
  useRouteStudentsDetalhado,
} from "@/features/driver/hooks/use-driver-routes";
import {
  useFinishTrip,
  usePauseTrip,
  useResumeTrip,
  useStartTrip,
  useTodayTrip,
} from "@/features/driver/hooks/use-driver-trip";
import { useTripGpsReporting } from "@/features/driver/hooks/use-trip-gps-reporting";
import { useWakeLock } from "@/features/driver/hooks/use-wake-lock";
import { TRIP_STATUS_BADGE } from "@/features/driver/trip-status";
import { useGpsTrack } from "@/features/gps/hooks/use-gps";
import { AlunoPreViagemRow } from "@/features/minha-rota/components/aluno-pre-viagem-row";
import { AlunosABordoCard } from "@/features/minha-rota/components/alunos-a-bordo-card";
import { MeuMapa } from "@/features/minha-rota/components/meu-mapa";
import { ModoOperacionalFullScreen } from "@/features/minha-rota/components/modo-operacional-full-screen";
import { ParadaCard } from "@/features/minha-rota/components/parada-card";
import { ProximaParadaEtaCard } from "@/features/minha-rota/components/proxima-parada-eta-card";
import { RegistrarOcorrenciaButton } from "@/features/minha-rota/components/registrar-ocorrencia-button";
import { TripElapsedTimer } from "@/features/minha-rota/components/trip-elapsed-timer";
import { TripStatsGrid } from "@/features/minha-rota/components/trip-stats-grid";
import { MONITOR_ACCENT, MOTORISTA_ACCENT, TURNO_LABEL } from "@/features/minha-rota/labels";
import {
  SentidoSwitch,
  TRIP_SENTIDO_DESCRICAO,
  TRIP_SENTIDO_LABEL,
} from "@/features/routes/components/sentido-switch";
import { useUpdateRoute } from "@/features/routes/hooks/use-routes";
import { useTripProximasEtas, useTripStudentEvents } from "@/features/trips/hooks/use-trips";
import { useVehicle, useVehiclesList } from "@/features/vehicles/hooks/use-vehicles";
import { useMyLocation } from "@/hooks/use-my-location";
import { notifyRouteStarted } from "@/lib/browser-notifications";

export function RotaOperacional({
  rota,
  showTrocarRota,
  onTrocarRota,
}: {
  rota: Route;
  showTrocarRota: boolean;
  onTrocarRota: () => void;
}): JSX.Element {
  const { user } = useAuth();
  // BUG CRÍTICO corrigido (pedido do usuário: "no modo ação não tem a
  // questão de escolher as rotas, nem de iniciar. Cadê o que eu te
  // pedi?") — `isMotorista` só checava `role === "motorista"`, mas o
  // dono autônomo/MEI (o público-alvo real do "Modo Ação") tem
  // `role === "empresa"` (mesmo princípio já documentado em
  // `rotas/novo/page.tsx`: "quem cadastra uma empresa AUTONOMO/MEI
  // recebe Membership.role = 'empresa', nunca 'motorista'"). Sem este
  // reconhecimento, TODO o bloco `isMotorista` desta tela — o botão
  // deslizante de iniciar, pausar/finalizar, o próprio reporte de GPS —
  // ficava permanentemente invisível pra essa conta, mesmo com uma rota
  // ATIVA de verdade: ela só via "Aguardando o motorista iniciar.",
  // como se nada tivesse sido implementado.
  const isAutonomoOuMei =
    user?.role === "empresa" && (user.companyType === "AUTONOMO" || user.companyType === "MEI");
  const isMotorista = user?.role === "motorista" || isAutonomoOuMei;
  const isMonitor = user?.role === "monitor";
  const accent = isMotorista ? MOTORISTA_ACCENT : MONITOR_ACCENT;
  const toast = useToast();

  const { data: trip, isLoading: isLoadingTrip } = useTodayTrip(rota.id);
  const { data: stops } = useRouteStops(rota.id);
  const { data: routeStudents } = useRouteStudents(rota.id);
  // Card "Próxima viagem" (pedido do usuário: "aparecerá as informações
  // — nome dos alunos, escolas, horário, bairros, responsáveis... embaixo
  // dessas informações, deverá ter o botão deslizante para iniciar a
  // viagem") — só busca antes da viagem existir, mesmo princípio de
  // `useMyLocation`/outros hooks condicionais nesta tela: nenhuma
  // consulta extra depois que a viagem já começou.
  const { data: routeStudentsDetalhado } = useRouteStudentsDetalhado(!trip ? rota.id : undefined);
  const { data: studentEvents } = useTripStudentEvents(trip?.id);
  const { data: veiculoPadrao } = useVehicle(rota.veiculoPadraoId ?? "");

  const startTrip = useStartTrip(rota.id);
  const pauseTrip = usePauseTrip(rota.id);
  const resumeTrip = useResumeTrip(rota.id);
  const finishTrip = useFinishTrip(rota.id);

  /**
   * Sentido da PRÓXIMA viagem (pedido do usuário 15/09/2026, "igual
   * placa de ônibus: Ida 🔄 Volta"). Sugere a volta quando a viagem
   * anterior de hoje foi a ida e já terminou — a sequência real do dia
   * —, mas segue sendo sugestão: dá pra trocar antes de deslizar.
   */
  const [sentidoEscolhido, setSentidoEscolhido] = useState<TripSentido | null>(null);
  const sentidoSugerido: TripSentido =
    trip && trip.sentido === "IDA" && (trip.status === "FINALIZADA" || trip.status === "CANCELADA")
      ? "VOLTA"
      : "IDA";
  const sentidoDaProximaViagem = sentidoEscolhido ?? sentidoSugerido;

  /** Reaproveitado tanto pela primeira viagem do dia quanto por "iniciar outra viagem" depois de uma já finalizada/cancelada (ver `viagemEncerrada` abaixo). */
  function handleIniciarViagem(): void {
    startTrip.mutate(
      { routeId: rota.id, sentido: sentidoDaProximaViagem },
      {
        // Erro já cai sozinho no toast global (`MutationCache.onError`,
        // `QueryProvider`) — aqui só o feedback positivo, pra ficar
        // claro que a viagem começou de verdade (pedido do usuário:
        // "não acontece a devida ação... fica na mesma tela").
        onSuccess: () => {
          toast.success("Viagem iniciada.");
          void notifyRouteStarted(rota.nome);
        },
      },
    );
  }

  const isActive = trip?.status === "EM_ANDAMENTO";
  // Correção 31/08/2026 (pedido do usuário: "Monitor e Motorista
  // integrados? Ações integradas?") — só o Motorista reportava GPS,
  // apesar do backend (`TripsService.assertCanOperateTrip`) já liberar
  // o Monitor pra `ingestPosition` desde a Frente AA. Sem isso, uma
  // viagem operada só pelo Monitor (motorista dirigindo, sem o painel
  // aberto) nunca reportava posição nenhuma — o mapa do responsável e o
  // próprio veículo-no-mapa desta tela ficavam sem dado.
  const podeReportarGps = isMotorista || isMonitor;
  const { status: gpsStatus } = useTripGpsReporting(
    podeReportarGps && isActive && trip ? trip.id : null,
  );
  // Tela acesa + aviso antes de fechar a aba enquanto a viagem está rolando — Motorista OU Monitor, mesmo escopo do GPS acima.
  useWakeLock(podeReportarGps && isActive);
  useBeforeUnloadWarning(podeReportarGps && isActive);

  // Ordem de PERCURSO, não a ordem cadastrada: numa viagem de volta as
  // mesmas paradas são percorridas ao contrário (ver
  // `ordenarParadasPorSentido`). Isso decide o traçado do mapa, a
  // numeração dos marcadores e a sequência dos cartões de parada —
  // tudo em que a ordem É o conteúdo. Sem viagem iniciada não há
  // sentido a respeitar, e cai na ordem cadastrada.
  const paradasOrdenadas = ordenarParadasPorSentido(stops ?? [], trip?.sentido);
  const markers: RottaMapMarker[] = paradasOrdenadas.map((parada, indice) => ({
    id: parada.id,
    titulo: `${indice + 1}. ${parada.endereco}`,
    latitude: parada.latitude,
    longitude: parada.longitude,
  }));

  // Respaldo (Frente I): sem paradas cadastradas ainda pra essa rota
  // (ou enquanto `stops` carrega), mostra pelo menos onde o telefone
  // está — nunca deixa a tela sem mapa nenhum. Também alimenta o
  // marcador do veículo abaixo (auditoria 27/08/2026, pedido do
  // usuário: "o motorista e monitor deverão saber onde estão. Cadê o
  // 'veículo' no mapa dos motoristas e monitores?") — por isso agora
  // fica sempre ligado nesta tela, não só quando faltam paradas.
  const minhaLocalizacao = useMyLocation(true);

  // Marcador do próprio veículo em movimento (Frente 2, pedido do
  // usuário — "todos deverão ter mapa, cada um na sua função"; reforçado
  // na auditoria 27/08/2026 — "motorista e monitor deverão saber onde
  // estão"). `GET /gps/trips/:tripId/track` é o único endpoint de GPS
  // que Motorista/Monitor podem chamar sobre a própria viagem (`getMap`/
  // `getForStudent` são restritos a Empresa/Gestor/Admin/Responsável) —
  // mas essa trilha só existe DEPOIS que o backend já recebeu pelo menos
  // 1 relatório de `useTripGpsReporting` (viagem `EM_ANDAMENTO`), então
  // o próprio motorista/monitor ficava sem se ver no mapa antes disso (e
  // sempre, se a viagem ainda nem começou). O marcador agora prioriza a
  // posição do PRÓPRIO telefone (`minhaLocalizacao`, instantânea, watch
  // contínuo, nunca depende de a viagem estar rodando) — a trilha do
  // backend só entra como respaldo se a localização do telefone ainda
  // não estiver disponível (permissão sendo solicitada/negada).
  const gpsTrackTripId =
    trip && trip.status !== "FINALIZADA" && trip.status !== "CANCELADA" ? trip.id : undefined;
  const { data: gpsTrack } = useGpsTrack(gpsTrackTripId);
  const ultimaPosicao = gpsTrack && gpsTrack.length > 0 ? gpsTrack[gpsTrack.length - 1] : undefined;
  const veiculoPosicao = minhaLocalizacao.location
    ? {
        latitude: minhaLocalizacao.location.latitude,
        longitude: minhaLocalizacao.location.longitude,
      }
    : ultimaPosicao
      ? { latitude: ultimaPosicao.latitude, longitude: ultimaPosicao.longitude }
      : null;
  // Deps em primitivos (não o objeto `veiculoPosicao`, recriado a cada
  // render) — senão o `useMemo` recalcula sempre, mesmo sem mudança real.
  const veiculoLatitude = veiculoPosicao?.latitude;
  const veiculoLongitude = veiculoPosicao?.longitude;
  const veiculoMarker: RottaMapMarker | null = useMemo(() => {
    if (veiculoLatitude === undefined || veiculoLongitude === undefined) return null;
    return {
      id: "veiculo-em-movimento",
      titulo: veiculoPadrao ? `${veiculoPadrao.modelo} · ${veiculoPadrao.placa}` : "Seu veículo",
      latitude: veiculoLatitude,
      longitude: veiculoLongitude,
      emMovimento: true,
    };
  }, [veiculoLatitude, veiculoLongitude, veiculoPadrao]);
  const mapMarkers: RottaMapMarker[] = veiculoMarker ? [...markers, veiculoMarker] : markers;

  // Posição do veículo, pro gate de proximidade (Frente 2, pedido do
  // usuário: "ao chegar próximo — raio de até 1km — poderá embarcar o
  // aluno") — sempre a trilha VERIFICADA pelo backend (nunca a leitura
  // crua do telefone de quem está olhando a tela agora — pode ser o
  // Monitor, num aparelho diferente do que de fato reporta GPS pra
  // viagem): é a posição do VEÍCULO que importa aqui pro gate, não a do
  // aparelho de quem está olhando. `null` sem posição conhecida ainda —
  // `estaProximo` nunca bloqueia nesse caso (ver `@rotta/maps/distance`),
  // então o motorista não fica travado só por o GPS ainda não ter
  // reportado a primeira posição.
  const driverPosition: DistanceCoordenada | null = ultimaPosicao
    ? { latitude: ultimaPosicao.latitude, longitude: ultimaPosicao.longitude }
    : null;

  // Próxima parada com ETA (Frente K — inspirado no cartão de
  // acompanhamento "Track Rider" da imagem de referência enviada pelo
  // usuário, adaptado ao que a Rotta já calcula de verdade:
  // `useTripProximasEtas` recalcula por distância real e por ausência
  // de aluno (tarefa #99) e já existia, mas só era consumido do lado do
  // Responsável — o próprio motorista/monitor nunca via essa mesma
  // conta enquanto dirige.
  const { data: proximasEtas } = useTripProximasEtas(isActive && trip ? trip.id : undefined);
  const proximaParada = proximasEtas?.[0];
  // Coordenada real da próxima parada (mesma lista que já vira marcador
  // no mapa acima) — alimenta o botão "Navegar" do cartão de ETA.
  const proximaParadaStop = proximaParada
    ? paradasOrdenadas.find((parada) => parada.id === proximaParada.routeStopId)
    : undefined;

  // Botão "centralizar no meu GPS" (Frente Q, imagem de referência) —
  // `RottaMap` só lê `initialCenter`/faz `fitBounds` na montagem, então
  // recentralizar de verdade remonta o mapa com uma nova `key`.
  const [mapKey, setMapKey] = useState(0);

  const gpsAvisoTexto =
    gpsStatus === "reporting"
      ? "Compartilhando sua localização com os responsáveis."
      : gpsStatus === "requesting"
        ? "Solicitando permissão de localização…"
        : gpsStatus === "denied"
          ? "Localização negada pelo navegador. Permita o acesso (ícone de cadeado na barra de endereço) pros responsáveis verem o veículo no mapa."
          : null;

  // Números reais do "Resumo da viagem" (modelo de referência) — nunca
  // recalculados de forma aproximada: alunos embarcados vem direto dos
  // eventos já gravados nesta viagem; paradas restantes é toda parada
  // em que ainda falta o evento esperado (embarque OU desembarque,
  // conforme o papel do aluno ali) de pelo menos um aluno — a mesma
  // regra que já decide o ícone de cada `AlunoParadaRow` abaixo.
  const alunosEmbarcados = (studentEvents ?? []).filter((e) => e.tipo === "EMBARCOU").length;
  const totalAlunos = (routeStudents ?? []).length;
  const progressoEmbarquePct =
    totalAlunos > 0 ? Math.round((alunosEmbarcados / totalAlunos) * 100) : 0;
  const paradasRestantesCount = paradasOrdenadas.filter((parada) => {
    const alunosDaParada = (routeStudents ?? []).filter(
      (aluno) => aluno.paradaEmbarqueId === parada.id || aluno.paradaDesembarqueId === parada.id,
    );
    if (alunosDaParada.length === 0) return false;
    return alunosDaParada.some((aluno) => {
      const isEmbarque = aluno.paradaEmbarqueId === parada.id;
      const tipoEsperado: TripStudentEventType = isEmbarque ? "EMBARCOU" : "DESEMBARCOU";
      const jaResolvido = (studentEvents ?? []).some(
        (e) => e.studentId === aluno.studentId && (e.tipo === tipoEsperado || e.tipo === "AUSENTE"),
      );
      return !jaResolvido;
    });
  }).length;

  const viagemEncerrada = trip && (trip.status === "FINALIZADA" || trip.status === "CANCELADA");

  // Frente AP (pedido do usuário: "quando a pessoa for iniciar uma
  // rota, deverá ter um veículo cadastrado — caso o motorista não
  // tenha, o pop-up deverá informar isso") — checagem PROATIVA no
  // cliente: o backend já rejeitava `POST /trips/start` sem
  // `veiculoPadraoId` (`"Informe veiculoId (rota sem veículo padrão)."`,
  // hoje visível via o toast global de erro), mas essa mensagem é
  // pensada pra quem chama a API, não pra quem dirige. Em vez de deixar
  // o motorista arrastar o botão e só então ver o erro técnico, a
  // ausência de veículo já bloqueia o slide e abre um pop-up (`Modal`)
  // assim que a tela carrega — `isDono` decide se aparece um botão de
  // ação (autônomo/MEI pode cadastrar o próprio veículo) ou só o aviso
  // (funcionário depende da transportadora, mesmo princípio de "Nenhuma
  // rota atribuída" logo acima nesta tela).
  const semVeiculoPadrao = !isLoadingTrip && !trip && isMotorista && !rota.veiculoPadraoId;
  const isDono = isAutonomoOuMei;
  const [avisoSemVeiculoAberto, setAvisoSemVeiculoAberto] = useState(false);
  useEffect(() => {
    if (semVeiculoPadrao) setAvisoSemVeiculoAberto(true);
  }, [semVeiculoPadrao]);

  // Pedido do usuário: "caso crie uma rota sem veículo... ele pode
  // credenciar um veículo para essa rota (caso já tenha cadastrado um
  // veículo na plataforma)... caso ele não tenha cadastrado nenhum
  // veículo, ele deverá cadastrar o veículo e depois poderá inserir na
  // rota" — antes só existia o caminho "cadastrar um veículo novo"
  // (`/veiculos/novo`), mesmo quando a empresa já tinha algum. Busca a
  // frota já cadastrada e, se houver pelo menos um veículo, oferece
  // vincular direto aqui em vez de obrigar um cadastro novo.
  const { data: veiculosDaEmpresa } = useVehiclesList({});
  const [veiculoEscolhidoId, setVeiculoEscolhidoId] = useState("");
  const updateRota = useUpdateRoute(rota.id);

  function handleVincularVeiculoExistente(): void {
    if (!veiculoEscolhidoId) return;
    updateRota.mutate(
      { veiculoPadraoId: veiculoEscolhidoId },
      {
        onSuccess: () => {
          toast.success("Veículo vinculado a esta rota.");
          setAvisoSemVeiculoAberto(false);
          setVeiculoEscolhidoId("");
        },
        onError: () => toast.error("Não foi possível vincular o veículo. Tente de novo."),
      },
    );
  }

  // Frente AP (pedido do usuário, depois de reportar que "deslizar para
  // iniciar não faz nada": "o mapa inteiro na tela... com um retângulo
  // flutuante... com os alunos, com um botão do lado - azul (embarque),
  // vermelho (desembarque)... mostra a próxima rota traçada... quando
  // todos, a próxima rota será a escola"). Tela cheia IN-PLACE — troca de
  // layout, nunca uma navegação de verdade (mesmo motivo já documentado
  // em `rotas/[id]/executar/page.tsx`: navegar pra um segmento dinâmico
  // já causou crash de renderização neste código). Continua enquanto
  // existir uma viagem não encerrada (inclusive `PAUSADA`, pra não trocar
  // de layout no meio da operação) — pro Motorista E o Monitor, já que os
  // dois operam embarque/desembarque (`AlunoParadaRow` abaixo nunca
  // filtrava por papel).
  if (trip && !viagemEncerrada) {
    return (
      <ModoOperacionalFullScreen
        rota={rota}
        trip={trip}
        accent={accent}
        isMotorista={isMotorista}
        isActive={isActive}
        mapMarkers={mapMarkers}
        paradasOrdenadas={paradasOrdenadas}
        driverPosition={driverPosition}
        routeStudents={routeStudents ?? []}
        studentEvents={studentEvents ?? []}
        proximasEtas={proximasEtas ?? []}
        alunosEmbarcados={alunosEmbarcados}
        totalAlunos={totalAlunos}
        gpsAvisoTexto={gpsAvisoTexto}
        pauseTrip={pauseTrip}
        resumeTrip={resumeTrip}
        finishTrip={finishTrip}
        mapKey={mapKey}
        onRecenter={() => setMapKey((k) => k + 1)}
      />
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <Modal
        isOpen={avisoSemVeiculoAberto}
        onClose={() => setAvisoSemVeiculoAberto(false)}
        ariaLabel="Nenhum veículo cadastrado"
      >
        <Modal.Header onClose={() => setAvisoSemVeiculoAberto(false)}>
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-warning/10 text-warning">
              <AlertTriangle size={20} />
            </span>
            <Typography variant="subtitle">Nenhum veículo cadastrado</Typography>
          </div>
        </Modal.Header>
        <Modal.Body className="flex flex-col gap-4">
          <Typography variant="body" color="muted">
            {isDono
              ? "Esta rota ainda não tem um veículo vinculado."
              : "Esta rota ainda não tem um veículo vinculado. Fale com sua transportadora para vincular um antes de iniciar a viagem."}
          </Typography>
          {isDono && veiculosDaEmpresa && veiculosDaEmpresa.items.length > 0 ? (
            <div className="flex flex-col gap-2">
              <Typography variant="bodySmall" className="font-medium">
                Já tem veículo cadastrado, vincule um a esta rota
              </Typography>
              <Select
                value={veiculoEscolhidoId}
                onChange={(event) => setVeiculoEscolhidoId(event.target.value)}
              >
                <option value="">Selecione um veículo</option>
                {veiculosDaEmpresa.items.map((veiculo) => (
                  <option key={veiculo.id} value={veiculo.id}>
                    {veiculo.modelo} · {veiculo.placa}
                  </option>
                ))}
              </Select>
            </div>
          ) : null}
        </Modal.Body>
        <Modal.Footer className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setAvisoSemVeiculoAberto(false)}>
            Fechar
          </Button>
          {isDono && veiculoEscolhidoId ? (
            <Button
              variant="primary"
              isLoading={updateRota.isPending}
              onClick={handleVincularVeiculoExistente}
            >
              Vincular veículo
            </Button>
          ) : isDono ? (
            <Link href="/veiculos/novo" className={buttonVariants({ variant: "primary" })}>
              Cadastrar veículo
            </Link>
          ) : null}
        </Modal.Footer>
      </Modal>

      <div className="flex items-start gap-2">
        <PanelGreeting nome={user?.nome ?? ""} className="flex-1" />
        {showTrocarRota ? (
          <Button variant="secondary" size="sm" onClick={onTrocarRota} className="shrink-0">
            Trocar rota
          </Button>
        ) : null}
      </div>

      {/*
        Mapa em CARTÃO, não em tela cheia (pedido do usuário: "veja para
        qual setor/cargo/segmento é e faça o design idêntico" às 3
        imagens de referência — nenhuma delas usa o mapa como fundo da
        tela inteira). Altura fixa e moderada, cantos arredondados pelo
        próprio `Card`.
      */}
      <Card variant="driver" className="overflow-hidden">
        <div className="relative h-52 w-full">
          {markers.length > 0 ? (
            <RottaMap
              key={mapKey}
              markers={mapMarkers}
              route={paradasOrdenadas.map((p) => ({
                latitude: p.latitude,
                longitude: p.longitude,
              }))}
              initialZoom={12}
            />
          ) : (
            <MeuMapa
              location={minhaLocalizacao.location}
              status={minhaLocalizacao.status}
              fill
              mapKey={mapKey}
            />
          )}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-end p-2">
            <RecenterButton onClick={() => setMapKey((k) => k + 1)} />
          </div>
        </div>
        <Card.Body className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-3">
            <Typography variant="subtitle" className="truncate">
              {rota.nome}
            </Typography>
            {trip ? (
              <Badge variant={TRIP_STATUS_BADGE[trip.status]?.variant ?? "neutral"}>
                {TRIP_STATUS_BADGE[trip.status]?.label ?? trip.status}
              </Badge>
            ) : (
              <Typography variant="caption" color="muted">
                {TURNO_LABEL[rota.turno] ?? rota.turno}
              </Typography>
            )}
          </div>
          {/* Código único da viagem (pedido do usuário: "o código da viagem - único") — só existe depois que a viagem já foi iniciada. */}
          {trip ? (
            <>
              <Typography variant="caption" color="muted" className="font-mono tracking-wide">
                Código da viagem: {trip.codigo}
              </Typography>
              {/* A "placa" da viagem em andamento — quem dirige precisa
                  ver em que sentido está, não só escolher no início. */}
              <Typography variant="caption" color="muted">
                Sentido: {TRIP_SENTIDO_LABEL[trip.sentido]} · {TRIP_SENTIDO_DESCRICAO[trip.sentido]}
              </Typography>
            </>
          ) : null}
          <Typography variant="bodySmall" color="muted">
            {proximaParada
              ? `Próxima parada: ${proximaParada.endereco}`
              : `${paradasOrdenadas.length} paradas nesta rota`}
          </Typography>
        </Card.Body>
      </Card>

      {/*
        "Próxima viagem" (modelo de referência — cartão pré-viagem
        mostra veículo + quantos alunos confirmados ANTES do motorista
        apertar "Iniciar viagem"). Só aparece antes da viagem existir;
        dado real (`useVehicle`/`routeStudents`), nunca um placeholder.
      */}
      {!trip && (veiculoPadrao ?? routeStudents) ? (
        <Card>
          <Card.Header title="Próxima viagem" />
          <Card.Body className="flex flex-col gap-3">
            <div className="flex gap-2">
              {veiculoPadrao ? (
                <div className="flex flex-1 flex-col items-start gap-0.5 rounded-xl bg-muted px-3 py-2">
                  <Typography variant="caption" color="muted">
                    Veículo
                  </Typography>
                  <Typography variant="bodySmall" className="font-semibold leading-tight">
                    {veiculoPadrao.modelo} · {veiculoPadrao.placa}
                  </Typography>
                </div>
              ) : null}
              {routeStudents ? (
                <div className="flex flex-1 flex-col items-start gap-0.5 rounded-xl bg-muted px-3 py-2">
                  <Typography variant="caption" color="muted">
                    Alunos
                  </Typography>
                  <Typography variant="bodySmall" className="font-semibold leading-tight">
                    {routeStudents.length} confirmados
                  </Typography>
                </div>
              ) : null}
            </div>

            {/*
              Lista detalhada por aluno (pedido do usuário: "aparecerá as
              informações — nome dos alunos, escolas, horário, bairros,
              responsáveis. Embaixo dessas informações, deverá ter o
              botão deslizante para iniciar a viagem/rota") — o botão
              deslizante em si já vive mais abaixo nesta mesma tela,
              fora deste cartão.
            */}
            {routeStudentsDetalhado && routeStudentsDetalhado.length > 0 ? (
              <div className="flex flex-col gap-2 border-t border-border pt-3">
                {routeStudentsDetalhado.map((aluno) => (
                  <AlunoPreViagemRow key={aluno.id} aluno={aluno} />
                ))}
              </div>
            ) : null}
          </Card.Body>
        </Card>
      ) : null}

      {/*
        "Viagem ativa" (modelo de referência) — cronômetro grande +
        resumo de 4 números só aparece com a viagem já rodando ou
        pausada (nunca antes de existir, nunca depois de encerrada: aí
        quem manda é a mensagem "viagem finalizada" abaixo).
      */}
      {trip && (trip.status === "EM_ANDAMENTO" || trip.status === "PAUSADA") ? (
        <Card>
          <Card.Body className="flex flex-col gap-3">
            <TripElapsedTimer iniciadaEm={trip.iniciadaEm} isRunning={isActive} accent={accent} />
            <TripStatsGrid
              totalAlunos={totalAlunos}
              alunosEmbarcados={alunosEmbarcados}
              paradasRestantes={paradasRestantesCount}
              veiculoId={trip.veiculoId}
              accent={accent}
            />
          </Card.Body>
        </Card>
      ) : null}

      {proximaParada ? (
        <ProximaParadaEtaCard eta={proximaParada} parada={proximaParadaStop} accent={accent} />
      ) : null}

      {/*
        Controles da viagem — o botão deslizante voltou (pedido do
        usuário, reafirmado depois da Frente 302/303: "com o botão
        deslizante para iniciar a viagem e finalizar também"). Só
        iniciar/encerrar usam `SlideToAction` — evita o disparo acidental
        que esses dois causariam sozinhos (fim de uma viagem em produção
        de verdade); pausar/retomar continuam botão comum, ação reversível.
      */}
      <div className="flex flex-col gap-2">
        {isLoadingTrip ? (
          <div className="flex justify-center py-2">
            <Spinner size="md" />
          </div>
        ) : !trip ? (
          isMotorista ? (
            semVeiculoPadrao ? (
              <Typography variant="bodySmall" color="muted" className="py-2 text-center">
                Esta rota ainda não tem um veículo cadastrado.{" "}
                {isDono
                  ? "Cadastre um veículo antes de iniciar a viagem."
                  : "Fale com sua transportadora para vincular um veículo a esta rota."}
              </Typography>
            ) : (
              <div className="flex flex-col gap-3">
                <SentidoSwitch
                  value={sentidoDaProximaViagem}
                  onChange={setSentidoEscolhido}
                  disabled={startTrip.isPending}
                />
                <SlideToAction
                  label={`Deslize para iniciar a ${TRIP_SENTIDO_LABEL[sentidoDaProximaViagem].toLowerCase()}`}
                  onComplete={handleIniciarViagem}
                  isLoading={startTrip.isPending}
                />
              </div>
            )
          ) : (
            <Typography variant="bodySmall" color="muted" className="py-2 text-center">
              Nenhuma viagem registrada hoje. Aguardando o motorista iniciar.
            </Typography>
          )
        ) : viagemEncerrada ? (
          isMotorista ? (
            /**
             * Pedido do usuário: "rotas não são feitas para ser
             * finalizadas concretamente... são finalizadas
             * temporariamente até o transportador acionar de novo" —
             * finalizar só encerra a VIAGEM de hoje, a rota continua
             * disponível pra outra viagem no mesmo dia (ida de manhã,
             * volta à tarde, por exemplo). Reaproveita a mesma
             * `startTrip` de sempre — o backend já aceita uma segunda
             * viagem pra mesma rota no mesmo dia contanto que a última
             * não esteja mais em andamento/pausada.
             */
            <div className="flex flex-col gap-3">
              <Typography variant="bodySmall" color="muted" className="text-center">
                A {TRIP_SENTIDO_LABEL[trip.sentido].toLowerCase()} de hoje já foi{" "}
                {trip.status === "FINALIZADA" ? "finalizada" : "cancelada"}. A rota continua
                disponível. Pode iniciar outra viagem quando precisar.
              </Typography>
              <SentidoSwitch
                value={sentidoDaProximaViagem}
                onChange={setSentidoEscolhido}
                disabled={startTrip.isPending}
              />
              <SlideToAction
                label={`Deslize para iniciar a ${TRIP_SENTIDO_LABEL[sentidoDaProximaViagem].toLowerCase()}`}
                onComplete={handleIniciarViagem}
                isLoading={startTrip.isPending}
              />
            </div>
          ) : (
            <Typography variant="bodySmall" color="muted" className="py-2 text-center">
              A viagem de hoje já foi {trip.status === "FINALIZADA" ? "finalizada" : "cancelada"}.
            </Typography>
          )
        ) : isMotorista ? (
          <>
            {gpsAvisoTexto ? (
              <Typography variant="caption" color="muted">
                {gpsAvisoTexto}
              </Typography>
            ) : null}
            {isActive ? (
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="lg"
                  iconLeft={<Pause size={16} />}
                  onClick={() => pauseTrip.mutate(trip.id)}
                  isLoading={pauseTrip.isPending}
                  aria-label="Pausar viagem"
                />
                <div className="flex-1">
                  <SlideToAction
                    label="Deslize para encerrar"
                    onComplete={() => finishTrip.mutate(trip.id)}
                    isLoading={finishTrip.isPending}
                    danger
                  />
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="lg"
                  iconLeft={<Play size={16} />}
                  onClick={() => resumeTrip.mutate(trip.id)}
                  isLoading={resumeTrip.isPending}
                  aria-label="Retomar viagem"
                />
                <div className="flex-1">
                  <SlideToAction
                    label="Deslize para finalizar"
                    onComplete={() => finishTrip.mutate(trip.id)}
                    isLoading={finishTrip.isPending}
                    danger
                  />
                </div>
              </div>
            )}
          </>
        ) : (
          <Typography variant="bodySmall" color="muted" className="py-2 text-center">
            Viagem em andamento. Só o motorista inicia, pausa ou finaliza.
          </Typography>
        )}
      </div>

      {trip && !viagemEncerrada ? (
        <>
          <AlunosABordoCard
            routeStudents={routeStudents ?? []}
            eventos={studentEvents ?? []}
            accent={accent}
          />
          <RegistrarOcorrenciaButton veiculoId={trip.veiculoId} accent={accent} />

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-3">
              <Typography variant="subtitle">Paradas</Typography>
              <Typography variant="caption" color="muted">
                {alunosEmbarcados}/{totalAlunos} embarcados
              </Typography>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full rounded-full ${accent.bg} transition-all`}
                style={{ width: `${progressoEmbarquePct}%` }}
              />
            </div>
          </div>

          {paradasOrdenadas.map((parada) => (
            <ParadaCard
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
            />
          ))}
        </>
      ) : null}
    </div>
  );
}

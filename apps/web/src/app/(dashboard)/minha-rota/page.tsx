"use client";

import { useAuth } from "@rotta/auth/web";
import {
  AlertTriangle,
  Check,
  Clock,
  LifeBuoy,
  List,
  Map as MapIcon,
  MapPin,
  MessageCircle,
  Navigation,
  Pause,
  Square,
  Timer,
  Users,
  UserX,
} from "@rotta/icons";
import { buildNavigationUrl, detectNavigationApp } from "@rotta/maps/navigation";
import { RottaMap, type RottaMapMarker } from "@rotta/maps/web";
import { Badge, Button, Card, PanelGreeting, Spinner, Typography } from "@rotta/ui/web";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import type {
  NextEta,
  Route,
  RouteStop,
  RouteStudent,
  TripStudentEventType,
} from "@rotta/api-client";
import type { Route as NextRoute } from "next";

import { RecenterButton } from "@/components/route-screen-chrome";
import { SlideToAction } from "@/components/slide-to-action";
import { useBeforeUnloadWarning } from "@/features/driver/hooks/use-before-unload-warning";
import {
  useMinhasRotas,
  useRouteStops,
  useRouteStudents,
} from "@/features/driver/hooks/use-driver-routes";
import {
  useAddStudentEvent,
  useFinishTrip,
  usePauseTrip,
  useResumeTrip,
  useStartTrip,
  useTodayTrip,
} from "@/features/driver/hooks/use-driver-trip";
import { useTripGpsReporting } from "@/features/driver/hooks/use-trip-gps-reporting";
import { useWakeLock } from "@/features/driver/hooks/use-wake-lock";
import { TRIP_STATUS_BADGE } from "@/features/driver/trip-status";
import { useUnreadNotificationsCount } from "@/features/notifications/hooks/use-notifications";
import { useStudent } from "@/features/students/hooks/use-students";
import { useTripProximasEtas, useTripStudentEvents } from "@/features/trips/hooks/use-trips";
import { useVehicle, useVehicleOccurrences } from "@/features/vehicles/hooks/use-vehicles";
import { useMyLocation, type MyLocation, type MyLocationStatus } from "@/hooks/use-my-location";
import { buildWhatsAppUrl } from "@/lib/site-config";

const TURNO_LABEL: Record<string, string> = {
  MANHA: "Manhã",
  TARDE: "Tarde",
  NOITE: "Noite",
  INTEGRAL: "Integral",
};

/**
 * "Minha Rota" — home operacional do Modo Ação (Frente G, pedido do
 * usuário em produção). Porta do "Início" real do app mobile
 * (`apps/mobile/src/features/driver/screens/inicio-screen.tsx`) para o
 * Painel Web — existe porque Motorista/Monitor autônomo/MEI É o próprio
 * `role: "empresa"` (dono = motorista, ver `CompanyType.AUTONOMO`/`MEI`)
 * e por isso é o único perfil que precisa rodar a viagem de dentro do
 * mesmo painel que já usa pra gestão. Motorista/Monitor FUNCIONÁRIO de
 * uma empresa maior também usa esta mesma página desde a Frente H — o
 * backend já escopava por `motoristaPadraoId`/`monitorPadraoId`
 * independente de quem é dono, só faltava apontar a navegação pra ele.
 *
 * Mesma UX do mobile: sem rota atribuída = mensagem honesta; múltiplas
 * rotas = escolher; uma rota = já cai na operação. GPS só liga enquanto
 * a viagem está `EM_ANDAMENTO` (`useTripGpsReporting`), e só o
 * Motorista (nunca o Monitor) inicia/pausa/finaliza.
 *
 * O MAPA (Frente I, pedido do usuário em produção — "deve aparecer
 * mesmo sem estar em uma rota, baseada na localização do próprio
 * telefone, pelo menos para visualização... vale tanto para autônomo,
 * MEI, motorista e monitor") aparece em TODO estado desta tela: sem
 * rota atribuída, escolhendo entre várias rotas, e como respaldo
 * dentro da operação enquanto as paradas ainda não carregaram — usando
 * a posição do telefone (`useMyLocation`) sempre que não há paradas de
 * rota pra mostrar em vez disso.
 *
 * `PanelGreeting` (Frente N) — o app nativo (Início/Histórico/Perfil,
 * Frente M) já tinha saudação+relógio; faltava aqui, deixando o Painel
 * Web do motorista/monitor/autônomo/MEI sem a mesma harmonia visual do
 * resto da plataforma (Empresa/Admin, Frente L; mobile, Frente M).
 */
export default function MinhaRotaPage(): JSX.Element {
  const { user } = useAuth();

  const { data: rotasResult, isLoading } = useMinhasRotas();
  const rotas = useMemo(() => rotasResult?.items ?? [], [rotasResult]);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedRouteId && rotas.length === 1 && rotas[0]) setSelectedRouteId(rotas[0].id);
  }, [rotas, selectedRouteId]);

  // Só liga fora da operação (nenhuma rota escolhida ainda) — dentro
  // de `RotaOperacional` existe uma segunda chamada própria, ligada só
  // quando faltam paradas pra mostrar. As duas nunca ficam ativas ao
  // mesmo tempo (são componentes diferentes, montados um de cada vez).
  const rotaAtiva = selectedRouteId ? rotas.find((r) => r.id === selectedRouteId) : null;
  const minhaLocalizacao = useMyLocation(!isLoading && !rotaAtiva);

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size="lg" />
      </div>
    );
  }

  if (rotas.length === 0) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
        <PanelGreeting nome={user?.nome ?? ""} />
        <div>
          <Typography variant="title">Nenhuma rota atribuída</Typography>
          <Typography variant="bodySmall" color="muted">
            {/*
              Antes esta frase mandava "cadastrar uma rota em 'Rotas' na
              Visão completa" — não existe (nem nunca existiu) nenhuma
              página de gestão de Rotas no Painel Web, só a operação em
              "Minha Rota" (esta tela). Corrigido pra não apontar pra um
              lugar que não existe — quem cadastra uma rota é sempre o
              suporte Rotta.
            */}
            Você ainda não está vinculado a nenhuma rota. Fale com o suporte Rotta ou com sua
            transportadora para vincular uma rota a você.
          </Typography>
        </div>
        <MeuMapa location={minhaLocalizacao.location} status={minhaLocalizacao.status} />
      </div>
    );
  }

  if (!rotaAtiva) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
        <PanelGreeting nome={user?.nome ?? ""} />
        <Typography variant="title">Suas rotas</Typography>
        {rotas.map((rota) => (
          <Card key={rota.id} interactive onClick={() => setSelectedRouteId(rota.id)}>
            <Card.Body className="flex items-center justify-between">
              <Typography variant="subtitle">{rota.nome}</Typography>
              <Typography variant="bodySmall" color="muted">
                {TURNO_LABEL[rota.turno] ?? rota.turno}
              </Typography>
            </Card.Body>
          </Card>
        ))}
        <MeuMapa location={minhaLocalizacao.location} status={minhaLocalizacao.status} />
      </div>
    );
  }

  return (
    <RotaOperacional
      rota={rotaAtiva}
      showTrocarRota={rotas.length > 1}
      onTrocarRota={() => setSelectedRouteId(null)}
    />
  );
}

/**
 * Mapa "onde eu estou" — respaldo baseado só na posição do telefone
 * (`useMyLocation`), usado sempre que não há paradas de rota pra
 * mostrar em vez disso. Nunca esconde a tela por trás de um estado de
 * carregamento indefinido: pedir/negar permissão e "sem suporte" têm
 * cada um sua própria mensagem, nunca um mapa em branco silencioso.
 */
function MeuMapa({
  location,
  status,
  fill = false,
  mapKey = 0,
}: {
  location: MyLocation | null;
  status: MyLocationStatus;
  /** `true` dentro do container em tela cheia de `RotaOperacional` — sem cantos arredondados/altura fixa, ocupa 100% do pai. */
  fill?: boolean;
  /** Troca pra remontar o mapa (Frente Q — botão "centralizar no meu GPS", `RottaMap` só lê `initialCenter` na montagem). */
  mapKey?: number;
}): JSX.Element {
  if (!location) {
    return (
      <div
        className={
          fill
            ? "flex h-full flex-col items-center justify-center gap-2 bg-card p-4 text-center"
            : "flex h-64 flex-col items-center justify-center gap-2 rounded-lg border border-border bg-card p-4 text-center"
        }
      >
        {status === "requesting" || status === "idle" ? (
          <>
            <Spinner size="md" />
            <Typography variant="caption" color="muted">
              Buscando sua localização…
            </Typography>
          </>
        ) : status === "denied" ? (
          <Typography variant="caption" color="muted" className="max-w-xs">
            Localização negada pelo navegador. Permita o acesso (ícone de cadeado na barra de
            endereço) para ver o mapa.
          </Typography>
        ) : (
          <Typography variant="caption" color="muted">
            Mapa indisponível neste navegador.
          </Typography>
        )}
      </div>
    );
  }

  return (
    <div
      style={fill ? undefined : { height: 280 }}
      className={fill ? "h-full w-full" : "overflow-hidden rounded-lg"}
    >
      <RottaMap
        key={mapKey}
        markers={[
          {
            id: "minha-localizacao",
            titulo: "Você está aqui",
            latitude: location.latitude,
            longitude: location.longitude,
          },
        ]}
        initialCenter={location}
        initialZoom={14}
      />
    </div>
  );
}

/**
 * Cartão "próxima parada" (Frente K) — mesma ideia do cartão de ETA da
 * imagem de referência ("Track Rider": rota + tempo estimado sempre à
 * vista durante o trajeto), só que aqui é o motorista/monitor vendo o
 * PRÓPRIO progresso, não um responsável acompanhando de fora. Dado real
 * (`NextEta`, tarefa #99) — nunca uma estimativa inventada no front.
 *
 * "Navegar" (Frente S2, pedido do usuário: "acha melhor integrar o
 * Google Maps para navegação e GPS, enquanto o openstreet fica para os
 * responsáveis") — abre o app de navegação NATIVO do aparelho
 * (Apple/Google Maps, `@rotta/maps/navigation`) com a coordenada real da
 * próxima parada (`parada`, a mesma que já alimenta o marcador no
 * `RottaMap` acima). Sem custo, sem chave de API: só um deep-link. Só
 * aparece quando `parada` existe (`RouteStop` com lat/lng carregado) —
 * sem coordenada, sem botão, nunca um link quebrado.
 */
function ProximaParadaEtaCard({ eta, parada }: { eta: NextEta; parada?: RouteStop }): JSX.Element {
  const horarioPrevisto = new Date(eta.etaPrevista).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const distancia =
    eta.distanciaMetros >= 1000
      ? `${(eta.distanciaMetros / 1000).toFixed(1)} km`
      : `${Math.round(eta.distanciaMetros)} m`;

  function handleNavegar(): void {
    if (!parada) return;
    const app = detectNavigationApp(navigator.userAgent);
    const url = buildNavigationUrl({ latitude: parada.latitude, longitude: parada.longitude }, app);
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <Card>
      <Card.Body className="flex items-center gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-muted text-primary">
          <Navigation size={20} />
        </div>
        <div className="flex-1">
          <Typography variant="caption" color="muted">
            Próxima parada
          </Typography>
          <Typography variant="bodySmall" className="font-semibold">
            {eta.endereco}
          </Typography>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <div className="flex items-center gap-1 text-primary">
            <Clock size={14} />
            <Typography variant="bodySmall" className="font-semibold text-primary">
              {horarioPrevisto}
            </Typography>
          </div>
          <Typography variant="caption" color="muted">
            {distancia}
          </Typography>
        </div>
        {parada ? (
          <Button
            variant="secondary"
            size="sm"
            iconLeft={<Navigation size={16} />}
            onClick={handleNavegar}
          >
            Navegar
          </Button>
        ) : null}
      </Card.Body>
    </Card>
  );
}

/** Mensagem exata já usada no popup de suporte pós-CNH — mesmo canal real, aqui só o contexto muda (motorista pedindo ajuda durante a operação, não logo após a verificação). */
const DRIVER_SUPPORT_WHATSAPP_MESSAGE = "Olá! Preciso de ajuda do suporte durante uma viagem.";

/**
 * Cronômetro da viagem ativa (pedido do usuário — modelo de referência
 * "Viagem ativa": grande, contando desde o início) — conta a partir de
 * `trip.iniciadaEm`, o mesmo timestamp real já gravado pelo backend
 * (nunca um relógio "de mentira" começando em zero visualmente).
 * Atualiza a cada segundo enquanto a viagem está `EM_ANDAMENTO`; parado
 * (não incrementa) quando `PAUSADA`, mostrando o tempo decorrido até a
 * pausa.
 */
function TripElapsedTimer({
  iniciadaEm,
  isRunning,
}: {
  iniciadaEm: string;
  isRunning: boolean;
}): JSX.Element {
  const [agora, setAgora] = useState(() => Date.now());

  useEffect(() => {
    if (!isRunning) return;
    const id = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(id);
  }, [isRunning]);

  const decorridoMs = Math.max(0, agora - new Date(iniciadaEm).getTime());
  const totalSegundos = Math.floor(decorridoMs / 1000);
  const horas = Math.floor(totalSegundos / 3600);
  const minutos = Math.floor((totalSegundos % 3600) / 60);
  const segundos = totalSegundos % 60;
  const texto =
    horas > 0
      ? `${horas}:${String(minutos).padStart(2, "0")}:${String(segundos).padStart(2, "0")}`
      : `${minutos}:${String(segundos).padStart(2, "0")}`;

  return (
    <div className="flex items-center gap-2 text-text">
      <Timer size={20} className={isRunning ? "text-primary" : "text-text-muted"} />
      <Typography variant="display" className="font-mono leading-none tabular-nums">
        {texto}
      </Typography>
      {!isRunning ? (
        <Typography variant="caption" color="muted">
          pausada
        </Typography>
      ) : null}
    </div>
  );
}

/**
 * "Resumo da viagem" — 4 números reais durante a operação (modelo de
 * referência "Viagem ativa": Alunos Embarcados/Ocorrências/Paradas
 * restantes/Mensagens). Nenhum é inventado:
 * - Alunos embarcados: contagem real de `TripStudentEvent` tipo
 *   `EMBARCOU` desta viagem.
 * - Paradas restantes: paradas cujos alunos ainda não têm os eventos
 *   esperados nelas (embarque OU desembarque, conforme o papel da
 *   parada pra cada aluno).
 * - Ocorrências hoje: `VehicleOccurrence` do veículo desta viagem,
 *   registradas hoje (o modelo não amarra ocorrência a uma `Trip`
 *   específica — "hoje" é a aproximação honesta mais próxima).
 * - Mensagens: notificações não lidas do próprio motorista/monitor
 *   (`useUnreadNotificationsCount`, a mesma Central de Notificações,
 *   não existe uma feature de chat separada na Rotta hoje).
 */
function TripStatsGrid({
  totalAlunos,
  alunosEmbarcados,
  paradasRestantes,
  veiculoId,
}: {
  totalAlunos: number;
  alunosEmbarcados: number;
  paradasRestantes: number;
  veiculoId: string;
}): JSX.Element {
  const { data: occurrences } = useVehicleOccurrences(veiculoId, 1, 50);
  const { data: unreadCount } = useUnreadNotificationsCount();

  const hojeISO = new Date().toISOString().slice(0, 10);
  const ocorrenciasHoje =
    occurrences?.items.filter((item) => item.createdAt.slice(0, 10) === hojeISO).length ?? 0;

  const tiles: { label: string; valor: string; icon: JSX.Element; href: NextRoute }[] = [
    {
      label: "Alunos embarcados",
      valor: `${alunosEmbarcados}/${totalAlunos}`,
      icon: <Users size={18} className="text-primary" />,
      href: "/minha-rota",
    },
    {
      label: "Paradas restantes",
      valor: String(paradasRestantes),
      icon: <MapPin size={18} className="text-primary" />,
      href: "/minha-rota",
    },
    {
      label: "Ocorrências hoje",
      valor: String(ocorrenciasHoje),
      icon: <AlertTriangle size={18} className="text-warning" />,
      href: "/veiculo",
    },
    {
      label: "Mensagens",
      valor: String(unreadCount ?? 0),
      icon: <MessageCircle size={18} className="text-primary" />,
      href: "/notificacoes",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-2.5">
      {tiles.map((tile) => (
        <Link
          key={tile.label}
          href={tile.href}
          className="flex flex-col gap-1 rounded-2xl border border-border bg-surface p-3 transition-colors hover:border-primary/40"
        >
          <div className="flex items-center gap-1.5">
            {tile.icon}
            <Typography variant="caption" color="muted">
              {tile.label}
            </Typography>
          </div>
          <Typography variant="subtitle" className="leading-none">
            {tile.valor}
          </Typography>
        </Link>
      ))}
      <a
        href={buildWhatsAppUrl(DRIVER_SUPPORT_WHATSAPP_MESSAGE)}
        target="_blank"
        rel="noopener noreferrer"
        className="col-span-2 flex items-center justify-center gap-2 rounded-2xl border border-border bg-surface p-3 text-primary transition-colors hover:border-primary/40"
      >
        <LifeBuoy size={18} />
        <Typography variant="bodySmall" className="font-semibold text-primary">
          Suporte — falar com a central
        </Typography>
      </a>
    </div>
  );
}

function RotaOperacional({
  rota,
  showTrocarRota,
  onTrocarRota,
}: {
  rota: Route;
  showTrocarRota: boolean;
  onTrocarRota: () => void;
}): JSX.Element {
  const { user } = useAuth();
  const isMotorista = user?.role === "motorista";

  const { data: trip, isLoading: isLoadingTrip } = useTodayTrip(rota.id);
  const { data: stops } = useRouteStops(rota.id);
  const { data: routeStudents } = useRouteStudents(rota.id);
  const { data: studentEvents } = useTripStudentEvents(trip?.id);
  const { data: veiculoPadrao } = useVehicle(rota.veiculoPadraoId ?? "");

  // Lista/Mapa (pedido do usuário, modelos de referência "Rota 12 -
  // Manhã"/"Viagem ativa": lista de alunos é a visão principal
  // enquanto dirige, mapa vira uma opção) — nunca some de vez (Frente
  // I: "deve aparecer mesmo sem estar em uma rota"), só encolhe pra
  // uma faixa quando a Lista está selecionada. Muda pra "lista"
  // sozinho assim que uma viagem existe hoje (o motorista acabou de
  // iniciar) — ele pode voltar pro mapa a qualquer momento pelo botão.
  const [viewMode, setViewMode] = useState<"mapa" | "lista">("mapa");
  const tripId = trip?.id;
  useEffect(() => {
    if (tripId) setViewMode("lista");
  }, [tripId]);

  const startTrip = useStartTrip(rota.id);
  const pauseTrip = usePauseTrip(rota.id);
  const resumeTrip = useResumeTrip(rota.id);
  const finishTrip = useFinishTrip(rota.id);

  const isActive = trip?.status === "EM_ANDAMENTO";
  const { status: gpsStatus } = useTripGpsReporting(
    isMotorista && isActive && trip ? trip.id : null,
  );
  // Tela acesa + aviso antes de fechar a aba enquanto a viagem está rolando — só o Motorista, mesmo escopo do GPS acima.
  useWakeLock(isMotorista && isActive);
  useBeforeUnloadWarning(isMotorista && isActive);

  const paradasOrdenadas = [...(stops ?? [])].sort((a, b) => a.ordem - b.ordem);
  const markers: RottaMapMarker[] = paradasOrdenadas.map((parada) => ({
    id: parada.id,
    titulo: `${parada.ordem}. ${parada.endereco}`,
    latitude: parada.latitude,
    longitude: parada.longitude,
  }));

  // Respaldo (Frente I): sem paradas cadastradas ainda pra essa rota
  // (ou enquanto `stops` carrega), mostra pelo menos onde o telefone
  // está — nunca deixa a tela sem mapa nenhum.
  const minhaLocalizacao = useMyLocation(markers.length === 0);

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
  const distanciaProximaParada =
    proximaParada && proximaParada.distanciaMetros >= 1000
      ? `${(proximaParada.distanciaMetros / 1000).toFixed(1)} km`
      : proximaParada
        ? `${Math.round(proximaParada.distanciaMetros)} m`
        : null;

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

  return (
    // `-m-6` cancela o padding do <main> de `(dashboard)/layout.tsx` só
    // nesta tela — pedido do usuário em produção: "o mapa não deve ser
    // um painel quadrado, ele deverá ser a interface toda do 'início'".
    // Saudação, status da rota, ETA e os controles da viagem (botão
    // deslizante, estilo Uber) flutuam por cima do mapa em cartões
    // translúcidos, em vez de empurrar o mapa pra uma caixinha.
    <div className="-m-6 flex flex-col">
      {/*
        `dvh` em vez de `vh` (BUG corrigido — no Safari/iOS o mapa não
        ocupava a tela toda: `100vh` lá sempre mede o viewport como se a
        barra de endereço estivesse recolhida, sobrando espaço/corte por
        baixo). `dvh` acompanha o tamanho real do viewport visível —
        junto com `viewportFit: "cover"` em `app/layout.tsx`.
      */}
      <div
        className={
          viewMode === "mapa"
            ? "relative h-[65dvh] min-h-[420px] w-full"
            : "relative h-40 w-full shrink-0"
        }
      >
        {markers.length > 0 ? (
          <RottaMap
            key={mapKey}
            markers={markers}
            route={paradasOrdenadas.map((p) => ({ latitude: p.latitude, longitude: p.longitude }))}
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

        <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-col gap-3 p-4">
          <div className="flex items-start gap-2">
            <PanelGreeting
              nome={user?.nome ?? ""}
              className="pointer-events-auto flex-1 rounded-2xl bg-surface-elevated/95 p-4 shadow-lg backdrop-blur"
            />
            {trip ? (
              <div
                role="tablist"
                aria-label="Lista ou mapa"
                className="pointer-events-auto flex shrink-0 items-center gap-1 rounded-full bg-surface-elevated/95 p-1 shadow-lg backdrop-blur"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={viewMode === "lista"}
                  aria-label="Lista"
                  onClick={() => setViewMode("lista")}
                  className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
                    viewMode === "lista"
                      ? "bg-primary text-white"
                      : "text-text-muted hover:text-text"
                  }`}
                >
                  <List size={16} />
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={viewMode === "mapa"}
                  aria-label="Mapa"
                  onClick={() => setViewMode("mapa")}
                  className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
                    viewMode === "mapa"
                      ? "bg-primary text-white"
                      : "text-text-muted hover:text-text"
                  }`}
                >
                  <MapIcon size={16} />
                </button>
              </div>
            ) : null}
          </div>
          {/*
            Cartão "De/Para" (Frente Q — imagem de referência de app de
            navegação: "Your location" -> "Select destinations"). De:
            sempre "Você" (quem está com o telefone/rodando a rota); Para:
            a próxima parada com ETA (`useTripProximasEtas`, já real) — só
            cai no nome da rota quando a viagem ainda nem começou.
          */}
          <div className="pointer-events-auto flex flex-col gap-2.5 rounded-2xl bg-surface-elevated/95 p-4 shadow-lg backdrop-blur">
            <div className="flex items-center justify-between gap-3">
              <div className="flex flex-1 flex-col gap-2">
                <div className="flex items-center gap-3">
                  <span className="h-2 w-2 shrink-0 rounded-full border-2 border-primary bg-surface-elevated" />
                  <Typography variant="bodySmall" className="truncate font-medium">
                    Você
                  </Typography>
                </div>
                <div className="ml-[3px] h-3 w-px border-l border-dashed border-border" />
                <div className="flex items-center gap-3">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-danger" />
                  <Typography variant="bodySmall" className="truncate font-medium">
                    {proximaParada ? proximaParada.endereco : rota.nome}
                  </Typography>
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                {trip ? (
                  <Badge variant={TRIP_STATUS_BADGE[trip.status]?.variant ?? "neutral"}>
                    {TRIP_STATUS_BADGE[trip.status]?.label ?? trip.status}
                  </Badge>
                ) : null}
                {showTrocarRota ? (
                  <Button variant="secondary" size="sm" onClick={onTrocarRota}>
                    Trocar
                  </Button>
                ) : null}
              </div>
            </div>
            {proximaParada && distanciaProximaParada && (
              <div className="flex gap-2 border-t border-border pt-2.5">
                <div className="flex flex-col items-start gap-0.5 rounded-xl bg-muted px-3 py-1.5">
                  <Typography variant="caption" color="muted">
                    Distância
                  </Typography>
                  <Typography variant="bodySmall" className="font-semibold leading-none">
                    {distanciaProximaParada}
                  </Typography>
                </div>
                <div className="flex flex-col items-start gap-0.5 rounded-xl bg-muted px-3 py-1.5">
                  <Typography variant="caption" color="muted">
                    Turno
                  </Typography>
                  <Typography variant="bodySmall" className="font-semibold leading-none">
                    {TURNO_LABEL[rota.turno] ?? rota.turno}
                  </Typography>
                </div>
              </div>
            )}
            {/*
              "Próxima viagem" (modelo de referência — cartão pré-viagem
              mostra veículo + quantos alunos confirmados ANTES do
              motorista deslizar pra iniciar). Só aparece antes da
              viagem existir; dado real (`useVehicle`/`routeStudents`),
              nunca um placeholder.
            */}
            {!trip && (veiculoPadrao ?? routeStudents) ? (
              <div className="flex gap-2 border-t border-border pt-2.5">
                {veiculoPadrao ? (
                  <div className="flex flex-col items-start gap-0.5 rounded-xl bg-muted px-3 py-1.5">
                    <Typography variant="caption" color="muted">
                      Veículo
                    </Typography>
                    <Typography variant="bodySmall" className="font-semibold leading-none">
                      {veiculoPadrao.modelo} · {veiculoPadrao.placa}
                    </Typography>
                  </div>
                ) : null}
                {routeStudents ? (
                  <div className="flex flex-col items-start gap-0.5 rounded-xl bg-muted px-3 py-1.5">
                    <Typography variant="caption" color="muted">
                      Alunos
                    </Typography>
                    <Typography variant="bodySmall" className="font-semibold leading-none">
                      {routeStudents.length} confirmados
                    </Typography>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-[13.5rem] flex justify-end p-4">
          <RecenterButton onClick={() => setMapKey((k) => k + 1)} />
        </div>

        <div className="pointer-events-auto absolute inset-x-0 bottom-0 flex flex-col gap-3 rounded-t-3xl bg-surface-elevated p-4 shadow-lg">
          {/*
            "Viagem ativa" (modelo de referência) — cronômetro grande +
            resumo de 4 números só aparece com a viagem já rodando ou
            pausada (nunca antes de existir, nunca depois de encerrada:
            aí quem manda é a mensagem "viagem finalizada" abaixo).
          */}
          {trip && (trip.status === "EM_ANDAMENTO" || trip.status === "PAUSADA") ? (
            <>
              <TripElapsedTimer iniciadaEm={trip.iniciadaEm} isRunning={isActive} />
              <TripStatsGrid
                totalAlunos={(routeStudents ?? []).length}
                alunosEmbarcados={alunosEmbarcados}
                paradasRestantes={paradasRestantesCount}
                veiculoId={trip.veiculoId}
              />
            </>
          ) : null}

          {proximaParada ? (
            <ProximaParadaEtaCard eta={proximaParada} parada={proximaParadaStop} />
          ) : null}

          {isLoadingTrip ? (
            <div className="flex justify-center py-2">
              <Spinner size="md" />
            </div>
          ) : !trip ? (
            isMotorista ? (
              <SlideToAction
                label="Deslize para iniciar viagem"
                onComplete={() => startTrip.mutate({ routeId: rota.id })}
                isLoading={startTrip.isPending}
              />
            ) : (
              <Typography variant="bodySmall" color="muted" className="py-2 text-center">
                Nenhuma viagem registrada hoje. Aguardando o motorista iniciar.
              </Typography>
            )
          ) : trip.status === "FINALIZADA" || trip.status === "CANCELADA" ? (
            <Typography variant="bodySmall" color="muted" className="py-2 text-center">
              A viagem de hoje já foi {trip.status === "FINALIZADA" ? "finalizada" : "cancelada"}.
            </Typography>
          ) : isMotorista ? (
            <>
              {gpsAvisoTexto ? (
                <Typography variant="caption" color="muted">
                  {gpsAvisoTexto}
                </Typography>
              ) : null}
              {isActive ? (
                <>
                  <Button
                    variant="secondary"
                    size="sm"
                    iconLeft={<Pause size={16} />}
                    onClick={() => pauseTrip.mutate(trip.id)}
                    isLoading={pauseTrip.isPending}
                    className="self-start"
                  >
                    Pausar
                  </Button>
                  <SlideToAction
                    label="Deslize para finalizar viagem"
                    thumbColorClassName="bg-danger"
                    onComplete={() => finishTrip.mutate(trip.id)}
                    isLoading={finishTrip.isPending}
                  />
                </>
              ) : (
                <>
                  <SlideToAction
                    label="Deslize para retomar viagem"
                    onComplete={() => resumeTrip.mutate(trip.id)}
                    isLoading={resumeTrip.isPending}
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    iconLeft={<Square size={16} />}
                    onClick={() => finishTrip.mutate(trip.id)}
                    isLoading={finishTrip.isPending}
                    className="self-start"
                  >
                    Finalizar viagem
                  </Button>
                </>
              )}
            </>
          ) : (
            <Typography variant="bodySmall" color="muted" className="py-2 text-center">
              Viagem em andamento. Só o motorista inicia, pausa ou finaliza.
            </Typography>
          )}
        </div>
      </div>

      {trip && trip.status !== "FINALIZADA" && trip.status !== "CANCELADA" ? (
        <div className="flex flex-col gap-4 p-6">
          <Typography variant="subtitle">Paradas</Typography>
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
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ParadaCard({
  parada,
  alunos,
  eventos,
  tripId,
  podeOperar,
}: {
  parada: RouteStop;
  alunos: RouteStudent[];
  eventos: { studentId: string; tipo: TripStudentEventType }[];
  tripId: string;
  podeOperar: boolean;
}): JSX.Element {
  return (
    <Card>
      <Card.Body className="flex flex-col gap-3">
        <div className="flex items-start gap-2">
          <MapPin size={16} className="mt-0.5 shrink-0 text-text-muted" />
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
            <AlunoParadaRow
              key={aluno.id}
              aluno={aluno}
              parada={parada}
              eventos={eventos}
              tripId={tripId}
              podeOperar={podeOperar}
            />
          ))
        )}
      </Card.Body>
    </Card>
  );
}

function AlunoParadaRow({
  aluno,
  parada,
  eventos,
  tripId,
  podeOperar,
}: {
  aluno: RouteStudent;
  parada: RouteStop;
  eventos: { studentId: string; tipo: TripStudentEventType }[];
  tripId: string;
  podeOperar: boolean;
}): JSX.Element {
  const { data: student } = useStudent(aluno.studentId);
  const addEvent = useAddStudentEvent(tripId);
  const [confirmandoAusencia, setConfirmandoAusencia] = useState(false);

  const isEmbarque = aluno.paradaEmbarqueId === parada.id;
  const tipo: TripStudentEventType = isEmbarque ? "EMBARCOU" : "DESEMBARCOU";
  const jaEmbarcou = eventos.some((e) => e.studentId === aluno.studentId && e.tipo === "EMBARCOU");
  const jaOcorreu = eventos.some((e) => e.studentId === aluno.studentId && e.tipo === tipo);
  const jaAusente = eventos.some((e) => e.studentId === aluno.studentId && e.tipo === "AUSENTE");
  // Desembarque só é possível depois de um embarque registrado nesta viagem (mesma regra do backend).
  const podeRegistrar = podeOperar && !jaOcorreu && !jaAusente && (isEmbarque || jaEmbarcou);

  return (
    <div className="flex items-center justify-between gap-3 border-t border-border pt-3 first:border-t-0 first:pt-0">
      <Typography variant="bodySmall">
        {isEmbarque ? "Embarque" : "Desembarque"}: {student?.nome ?? "Carregando…"}
      </Typography>
      {jaOcorreu ? (
        <Check size={18} className="text-success" />
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
        <div className="flex items-center gap-4">
          <button
            type="button"
            aria-label="Registrar"
            disabled={!podeRegistrar || addEvent.isPending}
            onClick={() => addEvent.mutate({ studentId: aluno.studentId, tipo })}
            className="text-success disabled:opacity-40"
          >
            <Check size={20} />
          </button>
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
  );
}

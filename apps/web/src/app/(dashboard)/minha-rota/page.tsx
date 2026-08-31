"use client";

import { MOTIVO_AUSENCIA_PRESETS } from "@rotta/api-client";
import { useAuth } from "@rotta/auth/web";
import {
  AlertTriangle,
  Check,
  Clock,
  LifeBuoy,
  LogIn,
  LogOut,
  MapPin,
  MessageCircle,
  Navigation,
  Pause,
  Play,
  Timer,
  Users,
  UserX,
} from "@rotta/icons";
import {
  estaProximo,
  haversineDistanceMeters,
  type DistanceCoordenada,
} from "@rotta/maps/distance";
import { buildNavigationUrl, detectNavigationApp } from "@rotta/maps/navigation";
import { isCoordenadaValida, type RottaMapMarker } from "@rotta/maps/types";
import {
  Badge,
  Button,
  Card,
  Input,
  Modal,
  PanelGreeting,
  Select,
  Spinner,
  Typography,
  buttonVariants,
  useToast,
} from "@rotta/ui/web";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import type {
  NextEta,
  Route,
  RouteStop,
  RouteStudent,
  RouteStudentDetalhado,
  Trip,
  TripStudentEventType,
} from "@rotta/api-client";
import type { Route as NextRoute } from "next";
import type { ReactNode } from "react";

import { RottaMapLazy as RottaMap } from "@/components/rotta-map-lazy";
import { RecenterButton } from "@/components/route-screen-chrome";
import { SlideToAction } from "@/components/slide-to-action";
import { useBeforeUnloadWarning } from "@/features/driver/hooks/use-before-unload-warning";
import {
  useMinhasRotas,
  useRouteStops,
  useRouteStudents,
  useRouteStudentsDetalhado,
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
import { useGpsTrack } from "@/features/gps/hooks/use-gps";
import { useNextStopTracedRoute } from "@/features/gps/hooks/use-next-stop-traced-route";
import { useUnreadNotificationsCount } from "@/features/notifications/hooks/use-notifications";
import { useUpdateRoute } from "@/features/routes/hooks/use-routes";
import { useStudent } from "@/features/students/hooks/use-students";
import {
  useTripProximasEtas,
  useTripStudentEvents,
  useTripStudentLocations,
} from "@/features/trips/hooks/use-trips";
import {
  useVehicle,
  useVehicleOccurrences,
  useVehiclesList,
} from "@/features/vehicles/hooks/use-vehicles";
import { useMyLocation, type MyLocation, type MyLocationStatus } from "@/hooks/use-my-location";
import { notifyRouteStarted } from "@/lib/browser-notifications";
import { buildWhatsAppUrl } from "@/lib/site-config";

/**
 * Altura reservada acima do `PortalBottomNav`/`DriverBottomNav`
 * (`fixed bottom-0`, ~64px de conteúdo + `env(safe-area-inset-bottom)`)
 * — usada por `DraggableFloatingCard` (auditoria 27/08/2026) pra nunca
 * ficar por trás da barra de navegação, nem na posição padrão nem
 * arrastado manualmente até o fim da tela.
 */
const BOTTOM_NAV_RESERVE_PX = 80;

const TURNO_LABEL: Record<string, string> = {
  MANHA: "Manhã",
  TARDE: "Tarde",
  NOITE: "Noite",
  INTEGRAL: "Integral",
};

/**
 * Cor de papel (Frente 300, imagens de referência anexadas pelo usuário
 * — Responsável verde/Motorista azul/Monitor roxo, pedido explícito:
 * "quero o mesmo design, sem imitações... quero idêntico"). Motorista
 * reaproveita `primary` (já é o azul da marca); só o Monitor usa o
 * acento novo (`monitorAccent`, ver `packages/theme/src/tokens/
 * colors.ts`) — nenhum token semântico (success/warning/danger)
 * muda de significado em lugar nenhum fora desta cor de identidade.
 */
interface RoleAccent {
  text: string;
  bg: string;
  muted: string;
  border: string;
}

const MOTORISTA_ACCENT: RoleAccent = {
  text: "text-primary",
  bg: "bg-primary",
  muted: "bg-primary-muted",
  border: "border-primary/40",
};

const MONITOR_ACCENT: RoleAccent = {
  text: "text-monitorAccent",
  bg: "bg-monitorAccent",
  muted: "bg-monitorAccent-muted",
  border: "border-monitorAccent/40",
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
 * Redesenho (Frente 302/303 — 3 imagens de referência anexadas pelo
 * usuário, Responsável/Motorista/Monitor, pedido explícito "quero o
 * mesmo design, idêntico... com usabilidades, funcionando"): o mapa
 * passou de tela cheia com cartões flutuando por cima (Frente P4) para
 * um CARTÃO compacto no topo de uma página que rola normalmente — igual
 * às 3 referências, nenhuma delas mostra o mapa ocupando a tela toda.
 * O botão deslizante estilo Uber (`SlideToAction`, Frente P3) tinha
 * saído desta tela quando as 3 referências chegaram (mostravam sempre
 * um botão comum) — voltou depois que o usuário reafirmou o pedido
 * explicitamente ("com o botão deslizante para iniciar a viagem e
 * finalizar também"): hoje só cobre iniciar/encerrar a viagem
 * (ações irreversíveis em produção); pausar/retomar continuam botão
 * comum, por serem reversíveis.
 * "Registrar ocorrência" (tela do Monitor) virou uma página cheia
 * própria (`/ocorrencia`) em vez de abrir um `Modal` por cima — mesma
 * ideia da referência, que mostra "Ocorrência" como tela dedicada.
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
        <Card className="overflow-hidden">
          <div className="h-52 w-full">
            <MeuMapa location={minhaLocalizacao.location} status={minhaLocalizacao.status} fill />
          </div>
        </Card>
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
        <Card className="overflow-hidden">
          <div className="h-52 w-full">
            <MeuMapa location={minhaLocalizacao.location} status={minhaLocalizacao.status} fill />
          </div>
        </Card>
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
  /** `true` dentro do cartão de mapa — sem cantos arredondados/altura fixa próprios, ocupa 100% do pai (que já define a altura). */
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
            // Mesmo ícone de veículo do mapa em operação (auditoria
            // 27/08/2026) — este mapa também é visto por
            // motorista/monitor/autônomo/MEI, nunca por Responsável, então
            // "Você está aqui" É o veículo, não um pino genérico.
            emMovimento: true,
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
function ProximaParadaEtaCard({
  eta,
  parada,
  accent,
}: {
  eta: NextEta;
  parada?: RouteStop;
  accent: RoleAccent;
}): JSX.Element {
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
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${accent.muted} ${accent.text}`}
        >
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
          <div className={`flex items-center gap-1 ${accent.text}`}>
            <Clock size={14} />
            <Typography variant="bodySmall" className={`font-semibold ${accent.text}`}>
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

/**
 * Uma linha por aluno no card "Próxima viagem" (pedido do usuário:
 * "aparecerá as informações — nome dos alunos, escolas, horário,
 * bairros, responsáveis"). Todo campo de `RouteStudentDetalhado` é
 * opcional (join que pode falhar isoladamente no backend) — nunca
 * mostra um traço genérico, só omite a informação que não veio.
 */
function AlunoPreViagemRow({ aluno }: { aluno: RouteStudentDetalhado }): JSX.Element {
  return (
    <div className="flex flex-col gap-0.5 rounded-xl bg-muted px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <Typography variant="bodySmall" className="font-semibold leading-tight">
          {aluno.studentNome ?? "Aluno"}
        </Typography>
        {aluno.horarioPrevisto ? (
          <Typography variant="caption" color="muted">
            {aluno.horarioPrevisto}
          </Typography>
        ) : null}
      </div>
      <Typography variant="caption" color="muted">
        {[aluno.schoolNome, aluno.bairro].filter(Boolean).join(" · ")}
      </Typography>
      {aluno.responsavelNome ? (
        <Typography variant="caption" color="muted">
          Responsável: {aluno.responsavelNome}
        </Typography>
      ) : null}
    </div>
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
  accent,
}: {
  iniciadaEm: string;
  isRunning: boolean;
  accent: RoleAccent;
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
      <Timer size={20} className={isRunning ? accent.text : "text-text-muted"} />
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
  accent,
}: {
  totalAlunos: number;
  alunosEmbarcados: number;
  paradasRestantes: number;
  veiculoId: string;
  accent: RoleAccent;
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
      icon: <Users size={18} className={accent.text} />,
      href: "/minha-rota",
    },
    {
      label: "Paradas restantes",
      valor: String(paradasRestantes),
      icon: <MapPin size={18} className={accent.text} />,
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
      icon: <MessageCircle size={18} className={accent.text} />,
      href: "/notificacoes",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-2.5">
      {tiles.map((tile) => (
        <Link
          key={tile.label}
          href={tile.href}
          className={`flex flex-col gap-1 rounded-2xl border border-border bg-surface p-3 transition-colors hover:${accent.border}`}
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
        className={`col-span-2 flex items-center justify-center gap-2 rounded-2xl border border-border bg-surface p-3 ${accent.text} transition-colors hover:${accent.border}`}
      >
        <LifeBuoy size={18} />
        <Typography variant="bodySmall" className={`font-semibold ${accent.text}`}>
          Suporte: falar com a central
        </Typography>
      </a>
    </div>
  );
}

/**
 * "Alunos a bordo" (modelo de referência — tela do Monitor, roxa) — o
 * papel do Monitor durante a viagem é conferir quem já embarcou e
 * ainda não desembarcou, sem precisar abrir cada parada uma por uma
 * (a lista por parada em `ParadaCard` continua existindo abaixo, essa
 * é só a visão consolidada). Um aluno está "a bordo" quando tem um
 * evento `EMBARCOU` registrado nesta viagem e ainda não tem o
 * `DESEMBARCOU` correspondente — dado real (`TripStudentEvent`),
 * nunca inferido.
 */
function AlunosABordoCard({
  routeStudents,
  eventos,
  accent,
}: {
  routeStudents: RouteStudent[];
  eventos: { studentId: string; tipo: TripStudentEventType }[];
  accent: RoleAccent;
}): JSX.Element | null {
  const aBordo = routeStudents.filter((aluno) => {
    const doAluno = eventos.filter((e) => e.studentId === aluno.studentId);
    const embarcou = doAluno.some((e) => e.tipo === "EMBARCOU");
    const desembarcou = doAluno.some((e) => e.tipo === "DESEMBARCOU");
    return embarcou && !desembarcou;
  });

  if (aBordo.length === 0) return null;

  return (
    <Card>
      <Card.Body className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Users size={16} className={accent.text} />
          <Typography variant="bodySmall" className="font-semibold">
            Alunos a bordo ({aBordo.length})
          </Typography>
        </div>
        <div className="flex flex-col gap-2">
          {aBordo.map((aluno) => (
            <AlunoABordoRow key={aluno.id} studentId={aluno.studentId} />
          ))}
        </div>
      </Card.Body>
    </Card>
  );
}

function AlunoABordoRow({ studentId }: { studentId: string }): JSX.Element {
  const { data: student } = useStudent(studentId);
  return (
    <div className="flex items-center gap-2 border-t border-border pt-2 first:border-t-0 first:pt-0">
      <span className="h-2 w-2 shrink-0 rounded-full bg-success" />
      <Typography variant="bodySmall">{student?.nome ?? "Carregando…"}</Typography>
    </div>
  );
}

/**
 * "Registrar ocorrência" (modelo de referência — tela do Monitor) —
 * link pra uma página CHEIA dedicada (`/ocorrencia`), não mais um
 * `Modal` por cima da viagem ativa. Mesma ideia das 3 imagens de
 * referência do usuário, que sempre mostram "Ocorrência" como tela
 * própria, nunca uma janela flutuante. Backend inalterado (`POST
 * /vehicles/:id/occurrences`, já libera MOTORISTA/MONITOR).
 */
function RegistrarOcorrenciaButton({
  veiculoId,
  accent,
}: {
  veiculoId: string;
  accent: RoleAccent;
}): JSX.Element {
  return (
    <Link
      href={`/ocorrencia?veiculoId=${veiculoId}` as NextRoute}
      className={buttonVariants({ variant: "secondary", className: `self-start ${accent.text}` })}
    >
      <AlertTriangle size={16} />
      Registrar ocorrência
    </Link>
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

  /** Reaproveitado tanto pela primeira viagem do dia quanto por "iniciar outra viagem" depois de uma já finalizada/cancelada (ver `viagemEncerrada` abaixo). */
  function handleIniciarViagem(): void {
    startTrip.mutate(
      { routeId: rota.id },
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
                Já tem veículo cadastrado — vincule um a esta rota
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
      <Card className="overflow-hidden">
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
            <Typography variant="caption" color="muted" className="font-mono tracking-wide">
              Código da viagem: {trip.codigo}
            </Typography>
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
              <SlideToAction
                label="Deslize para iniciar a viagem"
                onComplete={handleIniciarViagem}
                isLoading={startTrip.isPending}
              />
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
            <div className="flex flex-col gap-2">
              <Typography variant="bodySmall" color="muted" className="text-center">
                A viagem de hoje já foi {trip.status === "FINALIZADA" ? "finalizada" : "cancelada"}.
                A rota continua disponível — pode iniciar outra viagem quando precisar.
              </Typography>
              <SlideToAction
                label="Deslize para iniciar outra viagem"
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
                    thumbColorClassName="bg-danger"
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
                    thumbColorClassName="bg-danger"
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
function ModoOperacionalFullScreen({
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

      <DraggableFloatingCard>
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
                  thumbColorClassName="bg-danger"
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
              />
            ))}
          </div>
        ) : null}
      </DraggableFloatingCard>
    </div>
  );
}

/**
 * Cartão flutuante ARRASTÁVEL por cima do mapa em tela cheia (pedido do
 * usuário: "um retângulo com borda redonda flutuante, onde clicando ele
 * se arrasta e fica suspenso na tela, porém com maior visibilidade").
 * Pointer Events puro — mesma técnica de `SlideToAction` (sem lib de
 * gesto nova), só que arrastando livremente nas duas direções em vez de
 * deslizar travado num eixo. Começa "docado" perto do fim da tela
 * (posição via CSS, sem `left`/`top` inline); depois do primeiro arrasto,
 * passa a ser posicionado por coordenada absoluta, sempre restrita à
 * área visível da tela (nunca pode sumir arrastado pra fora). Só a ALÇA
 * (a barrinha no topo) inicia o arrasto — os botões de embarque/
 * desembarque dentro do cartão continuam clicáveis normalmente.
 */
function DraggableFloatingCard({ children }: { children: ReactNode }): JSX.Element {
  const cardRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(
    null,
  );

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>): void {
    event.currentTarget.setPointerCapture(event.pointerId);
    const rect = cardRef.current?.getBoundingClientRect();
    dragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      origX: pos?.x ?? rect?.left ?? 16,
      origY: pos?.y ?? rect?.top ?? 16,
    };
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>): void {
    if (!dragRef.current) return;
    const rect = cardRef.current?.getBoundingClientRect();
    const width = rect?.width ?? 320;
    const height = rect?.height ?? 200;
    const margem = 12;
    const nextX = dragRef.current.origX + (event.clientX - dragRef.current.startX);
    const nextY = dragRef.current.origY + (event.clientY - dragRef.current.startY);
    setPos({
      x: Math.min(Math.max(nextX, margem), window.innerWidth - width - margem),
      // Reserva `BOTTOM_NAV_RESERVE_PX` embaixo (não só `margem`) — sem
      // isso, arrastar o cartão até o fim da tela o deixava por trás da
      // barra de navegação (mesma correção do z-index acima).
      y: Math.min(
        Math.max(nextY, margem),
        window.innerHeight - height - margem - BOTTOM_NAV_RESERVE_PX,
      ),
    });
  }

  function handlePointerUp(event: React.PointerEvent<HTMLDivElement>): void {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragRef.current = null;
  }

  return (
    <div
      ref={cardRef}
      style={pos ? { left: pos.x, top: pos.y } : undefined}
      // `z-10` (não `z-modal`) e posição padrão `bottom-20` (não
      // `bottom-4`) — mesma correção do wrapper acima: o cartão é um
      // elemento `fixed` PRÓPRIO (z-index independente do wrapper), sem
      // isso continuaria cobrindo a barra de navegação mesmo com o mapa
      // já corrigido.
      className={`fixed z-10 flex max-h-[65vh] w-[min(92vw,400px)] flex-col overflow-hidden rounded-3xl border border-border bg-surface shadow-modal ${
        pos ? "" : "inset-x-0 bottom-20 mx-auto"
      }`}
    >
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        aria-hidden="true"
        className="flex shrink-0 cursor-grab touch-none items-center justify-center py-2 active:cursor-grabbing"
      >
        <div className="h-1.5 w-10 rounded-full bg-border" />
      </div>
      <div className="flex-1 overflow-y-auto px-4 pb-4">{children}</div>
    </div>
  );
}

/** "350m"/"1,2km" — mesmo padrão de arredondamento visual usado nos cartões de ETA (nunca mais de uma casa decimal). */
function formatarDistancia(metros: number): string {
  if (metros < 1000) return `${Math.round(metros)}m`;
  return `${(metros / 1000).toFixed(1).replace(".", ",")}km`;
}

function ParadaCard({
  parada,
  alunos,
  eventos,
  tripId,
  podeOperar,
  driverPosition,
}: {
  parada: RouteStop;
  alunos: RouteStudent[];
  eventos: { studentId: string; tipo: TripStudentEventType }[];
  tripId: string;
  podeOperar: boolean;
  driverPosition: DistanceCoordenada | null;
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
              driverPosition={driverPosition}
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
  driverPosition,
}: {
  aluno: RouteStudent;
  parada: RouteStop;
  eventos: { studentId: string; tipo: TripStudentEventType }[];
  tripId: string;
  podeOperar: boolean;
  driverPosition: DistanceCoordenada | null;
}): JSX.Element {
  const { data: student } = useStudent(aluno.studentId);
  const addEvent = useAddStudentEvent(tripId);
  const [formularioAusenciaAberto, setFormularioAusenciaAberto] = useState(false);
  const [motivoAusencia, setMotivoAusencia] = useState("");

  const isEmbarque = aluno.paradaEmbarqueId === parada.id;
  const tipo: TripStudentEventType = isEmbarque ? "EMBARCOU" : "DESEMBARCOU";
  const jaEmbarcou = eventos.some((e) => e.studentId === aluno.studentId && e.tipo === "EMBARCOU");
  const jaOcorreu = eventos.some((e) => e.studentId === aluno.studentId && e.tipo === tipo);
  const jaAusente = eventos.some((e) => e.studentId === aluno.studentId && e.tipo === "AUSENTE");

  // Item 3 do pedido do usuário: "reconhecer o endereço alternativo do
  // responsável dentro do raio de embarque/desembarque" — quando este
  // aluno tem um `StudentAddressOverride` ativo hoje pro trecho atual,
  // `useTripStudentLocations` já devolve a coordenada EFETIVA (a casa
  // alternativa, não a `RouteStop` física); sem desvio, o backend já
  // devolve as mesmas coordenadas da própria parada, então o `?? ` de
  // baixo é só um respaldo pro instante antes do primeiro fetch.
  const { data: studentLocations } = useTripStudentLocations(tripId);
  const localizacaoEfetiva = studentLocations?.find(
    (loc) =>
      loc.studentId === aluno.studentId && loc.tipo === (isEmbarque ? "EMBARQUE" : "DESEMBARQUE"),
  );

  // Gate de proximidade (Frente 2, pedido do usuário: "ao chegar próximo
  // — um raio de até 1km — poderá embarcar/desembarcar o aluno daquela
  // localidade"). `driverPosition` vem da última posição de GPS já
  // reportada pra esta viagem; sem posição ainda conhecida,
  // `estaProximo` responde `true` (nunca trava o motorista por o GPS
  // ainda não ter reportado nada — mesmo princípio "best effort" do
  // geofencing de notificação no backend).
  const paradaCoordenada: DistanceCoordenada = localizacaoEfetiva
    ? { latitude: localizacaoEfetiva.latitude, longitude: localizacaoEfetiva.longitude }
    : { latitude: parada.latitude, longitude: parada.longitude };
  const distanciaMetros = driverPosition
    ? haversineDistanceMeters(driverPosition, paradaCoordenada)
    : null;
  const perto = estaProximo(driverPosition, paradaCoordenada);
  // Desembarque só é possível depois de um embarque registrado nesta viagem (mesma regra do backend).
  const elegivel = !jaOcorreu && !jaAusente && (isEmbarque || jaEmbarcou);
  const podeRegistrar = podeOperar && elegivel && perto;
  const longeDemais = podeOperar && elegivel && !perto;

  function handleConfirmarAusencia(): void {
    addEvent.mutate(
      {
        studentId: aluno.studentId,
        tipo: "AUSENTE",
        motivoAusencia: motivoAusencia.trim() || undefined,
      },
      {
        onSuccess: () => {
          setFormularioAusenciaAberto(false);
          setMotivoAusencia("");
        },
      },
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
          <Check size={18} className="text-success" />
        ) : jaAusente ? (
          <Typography variant="caption" className="text-danger">
            Ausente
          </Typography>
        ) : !formularioAusenciaAberto ? (
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
                onClick={() => setFormularioAusenciaAberto(true)}
                className="text-danger disabled:opacity-40"
              >
                <UserX size={20} />
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* Pedido do usuário: "abrindo um formulário simples e opcional
          (motivo com opções ou comentário, ambos opcionais)" — nenhum
          campo é obrigatório pra confirmar; as opções só preenchem o
          mesmo campo de texto livre que o backend já aceita. */}
      {formularioAusenciaAberto && isEmbarque ? (
        <div className="flex flex-col gap-2 rounded-2xl bg-surface-muted p-3">
          <Typography variant="caption" color="muted">
            Motivo da ausência (opcional)
          </Typography>
          <div className="flex flex-wrap gap-1.5">
            {MOTIVO_AUSENCIA_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setMotivoAusencia(preset)}
                className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                  motivoAusencia === preset
                    ? "border-danger bg-danger/10 text-danger"
                    : "border-border text-text-muted"
                }`}
              >
                {preset}
              </button>
            ))}
          </div>
          <Input
            size="sm"
            value={motivoAusencia}
            onChange={(event) => setMotivoAusencia(event.target.value)}
            placeholder="Ou escreva um comentário (opcional)"
            maxLength={500}
          />
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="danger"
              size="sm"
              isLoading={addEvent.isPending}
              onClick={handleConfirmarAusencia}
            >
              Confirmar ausência
            </Button>
            <button
              type="button"
              className="text-xs text-text-muted hover:underline"
              onClick={() => {
                setFormularioAusenciaAberto(false);
                setMotivoAusencia("");
              }}
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : null}

      {longeDemais ? (
        <Typography variant="caption" color="muted">
          Aproxime-se até 1km do local para liberar o botão
          {distanciaMetros !== null ? ` (você está a ${formatarDistancia(distanciaMetros)})` : ""}.
        </Typography>
      ) : null}
    </div>
  );
}

"use client";

import {
  ArrowDownCircle,
  ArrowUpCircle,
  Clock,
  MapPin,
  MessageCircle,
  Navigation,
  UserX,
} from "@rotta/icons";
import { RottaMap, type RottaMapMarker } from "@rotta/maps/web";
import { Badge, Card, Spinner, Typography, buttonVariants } from "@rotta/ui/web";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";

import type { StudentEventsHistoryRange, TripStudentEventType } from "@rotta/api-client";
import type { Route } from "next";

import { RecenterButton, RouteFromToCard } from "@/components/route-screen-chrome";
import { useGpsForStudent, useStudentEventsHistory } from "@/features/gps/hooks/use-gps";
import { useSchool } from "@/features/schools/hooks/use-schools";
import { useRoutePreview } from "@/features/students/hooks/use-route-preview";
import { useStudent } from "@/features/students/hooks/use-students";
import { useTripProximasEtas } from "@/features/trips/hooks/use-trips";


const EVENT_LABEL: Record<TripStudentEventType, string> = {
  EMBARCOU: "Embarcou",
  AUSENTE: "Marcado como ausente",
  DESEMBARCOU: "Desembarcou",
};

/**
 * Ícone colorido por tipo de evento (modelo de referência enviado pelo
 * usuário — tela do Responsável com ícones de notificação coloridos em
 * vez de texto plano): verde pra embarque, azul pra desembarque,
 * vermelho pra ausência — a mesma paleta semântica já usada em
 * `AlunoParadaRow` (`minha-rota/page.tsx`, sucesso/perigo).
 */
const EVENT_ICON: Record<TripStudentEventType, JSX.Element> = {
  EMBARCOU: <ArrowUpCircle size={18} className="text-success" />,
  DESEMBARCOU: <ArrowDownCircle size={18} className="text-primary" />,
  AUSENTE: <UserX size={18} className="text-danger" />,
};

const HISTORY_RANGE_LABEL: Record<StudentEventsHistoryRange, string> = {
  hoje: "Hoje",
  semana: "Semana",
  mes: "Mês",
};

/**
 * Histórico de embarque/desembarque do próprio filho, com abas
 * Hoje/Semana/Mês (modelo de referência enviado pelo usuário). Dado
 * real (`GET /gps/students/:id/events-history`, tarefa desta Frente) —
 * cobre viagens de QUALQUER dia dentro da janela escolhida, não só a
 * viagem em curso agora (por isso aparece nos 3 estados da página:
 * com/sem viagem ativa, com/sem prévia de rota).
 */
function HistoricoEventosCard({ studentId }: { studentId: string }): JSX.Element {
  const [range, setRange] = useState<StudentEventsHistoryRange>("hoje");
  const { data: eventos, isLoading } = useStudentEventsHistory(studentId, range);

  return (
    <Card>
      <Card.Header
        title="Histórico"
        action={
          <div role="tablist" aria-label="Período" className="flex items-center gap-1">
            {(Object.keys(HISTORY_RANGE_LABEL) as StudentEventsHistoryRange[]).map((key) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={range === key}
                onClick={() => setRange(key)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                  range === key
                    ? "bg-primary text-white"
                    : "bg-muted text-text-muted hover:text-text"
                }`}
              >
                {HISTORY_RANGE_LABEL[key]}
              </button>
            ))}
          </div>
        }
      />
      <Card.Body className="flex flex-col gap-3">
        {isLoading ? (
          <div className="flex justify-center py-6">
            <Spinner size="md" />
          </div>
        ) : !eventos || eventos.length === 0 ? (
          <Typography variant="bodySmall" color="muted" className="py-2 text-center">
            Nenhum embarque ou desembarque registrado neste período.
          </Typography>
        ) : (
          eventos.map((event) => (
            <div key={event.id} className="flex items-center gap-3">
              {EVENT_ICON[event.tipo]}
              <Typography variant="bodySmall" className="flex-1">
                {EVENT_LABEL[event.tipo]}
              </Typography>
              <Typography variant="caption" color="muted">
                {range === "hoje"
                  ? formatarHora(event.processadoEm)
                  : new Date(event.processadoEm).toLocaleString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
              </Typography>
            </div>
          ))
        )}
      </Card.Body>
    </Card>
  );
}

function formatarHora(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

/** Distância legível (m/km) — mesmo formato usado em `alunos/novo/page.tsx`. */
function formatarDistancia(metros: number): string {
  return metros >= 1000 ? `${(metros / 1000).toFixed(1)} km` : `${Math.round(metros)} m`;
}

function formatarDuracao(segundos: number): string {
  return `${Math.max(1, Math.round(segundos / 60))} min`;
}

function VoltarLink({ studentId, nome }: { studentId: string; nome?: string }): JSX.Element {
  return (
    <Link href={`/alunos/${studentId}`} className="text-sm text-primary hover:underline">
      ← {nome ?? "Aluno"}
    </Link>
  );
}

/**
 * Prévia "De/Para" — casa (embarque) até a escola, ANTES de qualquer
 * viagem existir (Frente Q, pedido do usuário: imagem de referência de
 * app de navegação — "Your location"/"Select destinations" — obrigatória
 * assim que o Responsável termina de cadastrar o aluno). Só aparece
 * quando as duas pontas já têm coordenada confirmada (embarque
 * geocodificado no cadastro + escola já validada pelo Geocoding AI
 * Agent) — sem as duas, cai no aviso simples de sempre, nunca um mapa
 * vazio ou uma rota inventada.
 */
function PreviaRotaAteEscola({
  studentId,
  nome,
  embarque,
  escolaNome,
  destino,
}: {
  studentId: string;
  nome?: string;
  embarque: { latitude: number; longitude: number };
  escolaNome: string;
  destino: { latitude: number; longitude: number };
}): JSX.Element {
  const { route, distanciaMetros, duracaoSegundos, isLoading } = useRoutePreview(embarque, destino);
  const [mapKey, setMapKey] = useState(0);

  const markers: RottaMapMarker[] = [
    {
      id: "embarque",
      titulo: "Embarque",
      latitude: embarque.latitude,
      longitude: embarque.longitude,
    },
    { id: "escola", titulo: escolaNome, latitude: destino.latitude, longitude: destino.longitude },
  ];

  const chips =
    distanciaMetros !== null && duracaoSegundos !== null
      ? [
          { label: "Distância", value: formatarDistancia(distanciaMetros) },
          { label: "Tempo estimado", value: formatarDuracao(duracaoSegundos) },
        ]
      : undefined;

  return (
    <div className="-m-6 flex flex-col">
      <div className="relative h-[70dvh] min-h-[460px] w-full">
        <RottaMap key={mapKey} markers={markers} route={route ?? undefined} initialZoom={13} />

        <RouteFromToCard
          voltarHref={`/alunos/${studentId}` as Route}
          origemLabel={`Embarque de ${nome ?? "aluno"}`}
          destinoLabel={escolaNome}
          chips={chips}
        />

        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4">
          <div className="pointer-events-auto flex-1 rounded-2xl bg-surface-elevated/95 p-4 shadow-lg backdrop-blur">
            <Typography variant="subtitle" className="leading-tight">
              Rota até a escola
            </Typography>
            <Typography variant="bodySmall" color="muted">
              {isLoading
                ? "Traçando o trajeto…"
                : "Aparece aqui automaticamente assim que a viagem do dia começar. Esta página atualiza sozinha a cada 10 segundos."}
            </Typography>
          </div>
          <RecenterButton onClick={() => setMapKey((k) => k + 1)} />
        </div>
      </div>
    </div>
  );
}

/**
 * "Meu Transporte" — localização em tempo real do transporte do aluno
 * (missão central da Rotta pro Responsável, GPS-01/03/06). `GET
 * /gps/students/:id` já existia e já tinha um hook web pronto
 * (`useGpsForStudent`) — só nenhuma tela consumia. Atualiza sozinho a
 * cada 10s, mesmo padrão do localizador de Empresa (`/veiculos/mapa`).
 *
 * Redesenho (pedido do usuário, com a mesma imagem de referência "Track
 * Rider" já usada nas Frentes K/L/M): enquanto há uma viagem em curso, o
 * mapa passa a ocupar a tela inteira — mesmo padrão em tela cheia com
 * cartões translúcidos flutuando por cima já usado do lado do motorista
 * em `minha-rota/page.tsx` (Frente P4), agora do lado de quem acompanha.
 *
 * Frente Q (nova imagem de referência — cartão "De/Para" + chips de
 * distância/tempo + botão de centralizar): antes de qualquer viagem
 * existir, esta tela já mostra a prévia da rota até a escola
 * (`PreviaRotaAteEscola`) em vez de só um aviso vazio — obrigatória
 * assim que o cadastro do aluno termina (`alunos/novo/page.tsx` agora
 * manda pra cá em vez de pra ficha do aluno).
 *
 * O botão "Falar com a transportadora" aponta para os Chamados (canal
 * real de contato que já existe) — a Rotta não tem chat ao vivo com o
 * motorista, então nada de fingir um botão de chat que não faz nada.
 */
export default function AlunoMapaPage(): JSX.Element {
  const params = useParams<{ id: string }>();
  const studentId = params.id;
  const { data: student } = useStudent(studentId);
  const { data: school } = useSchool(student?.schoolId ?? "");
  const { data: viagem, isLoading } = useGpsForStudent(studentId);
  const { data: proximasEtas } = useTripProximasEtas(viagem?.tripId);
  const [mapKey, setMapKey] = useState(0);

  const markers = useMemo<RottaMapMarker[]>(() => {
    if (!viagem?.latitude || !viagem.longitude) return [];
    return [
      {
        id: viagem.tripId,
        titulo: `${viagem.placa} — ${viagem.motoristaNome}`,
        latitude: viagem.latitude,
        longitude: viagem.longitude,
        emMovimento: true,
      },
    ];
  }, [viagem]);

  if (isLoading) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
        <VoltarLink studentId={studentId} nome={student?.nome} />
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      </div>
    );
  }

  if (!viagem) {
    const embarque =
      student?.embarqueLatitude && student.embarqueLongitude
        ? { latitude: student.embarqueLatitude, longitude: student.embarqueLongitude }
        : null;
    const destino =
      school?.latitude && school.longitude
        ? { latitude: school.latitude, longitude: school.longitude }
        : null;

    if (embarque && destino && school) {
      return (
        <PreviaRotaAteEscola
          studentId={studentId}
          nome={student?.nome}
          embarque={embarque}
          escolaNome={school.nomeOficial}
          destino={destino}
        />
      );
    }

    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
        <VoltarLink studentId={studentId} nome={student?.nome} />
        <Typography variant="title">Localização em tempo real</Typography>
        <Card>
          <Card.Body className="flex flex-col items-center gap-2 py-12 text-center">
            <Typography variant="subtitle">Nenhum transporte em andamento agora</Typography>
            <Typography variant="bodySmall" color="muted" className="max-w-sm">
              O mapa aparece aqui automaticamente assim que a viagem do dia começar. Esta página
              atualiza sozinha a cada 10 segundos.
            </Typography>
          </Card.Body>
        </Card>
        <HistoricoEventosCard studentId={studentId} />
      </div>
    );
  }

  const proximaParada = proximasEtas?.[0];

  return (
    // `-m-6` cancela o padding do <main> de `(dashboard)/layout.tsx` só
    // nesta tela, mesma decisão de `minha-rota/page.tsx` — o mapa deve
    // ocupar a tela inteira enquanto há viagem em curso, nunca um
    // quadrado dentro de um cartão.
    <div className="-m-6 flex flex-col">
      {/*
        `dvh` em vez de `vh` (BUG corrigido — no Safari/iOS o mapa não
        ocupava a tela toda: `100vh` lá sempre mede o viewport como se a
        barra de endereço estivesse recolhida, sobrando espaço/corte por
        baixo). `dvh` acompanha o tamanho real do viewport visível —
        junto com `viewportFit: "cover"` em `app/layout.tsx`.
      */}
      <div className="relative h-[70dvh] min-h-[460px] w-full">
        {markers.length > 0 ? (
          <RottaMap
            key={mapKey}
            markers={markers}
            initialCenter={{ latitude: viagem.latitude!, longitude: viagem.longitude! }}
            initialZoom={14}
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-card">
            <Typography variant="bodySmall" color="muted">
              Aguardando a primeira posição do motorista…
            </Typography>
          </div>
        )}

        <RouteFromToCard
          voltarHref={`/alunos/${studentId}` as Route}
          origemLabel={`${viagem.placa} — ${viagem.motoristaNome}`}
          destinoLabel={proximaParada ? proximaParada.endereco : "Próxima parada"}
        />

        {markers.length > 0 && (
          <div className="pointer-events-none absolute inset-x-0 bottom-[13.5rem] flex justify-end p-4">
            <RecenterButton onClick={() => setMapKey((k) => k + 1)} />
          </div>
        )}

        <div className="pointer-events-auto absolute inset-x-0 bottom-0 flex flex-col gap-3 rounded-t-3xl bg-surface-elevated p-4 shadow-lg">
          <div className="flex items-center justify-between gap-3">
            <Badge variant="success">Em viagem agora</Badge>
            {proximaParada ? (
              <div className="flex items-center gap-1 text-primary">
                <Clock size={14} />
                <Typography variant="bodySmall" className="font-semibold text-primary">
                  Chegando às {formatarHora(proximaParada.etaPrevista)}
                </Typography>
              </div>
            ) : null}
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-border p-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-muted text-primary">
              <Navigation size={20} />
            </div>
            <div className="flex-1">
              <Typography variant="bodySmall" className="font-semibold">
                {viagem.placa} — {viagem.routeNome}
              </Typography>
              <Typography variant="caption" color="muted">
                Motorista: {viagem.motoristaNome}
                {viagem.monitorNome ? ` · Monitor: ${viagem.monitorNome}` : ""}
              </Typography>
            </div>
          </div>

          {proximasEtas && proximasEtas.length > 0 ? (
            <div className="flex flex-col gap-2">
              {proximasEtas.slice(0, 2).map((eta) => (
                <div key={eta.routeStopId} className="flex items-center gap-2">
                  <MapPin size={14} className="shrink-0 text-text-muted" />
                  <Typography variant="caption" className="flex-1 truncate">
                    {eta.endereco}
                  </Typography>
                  <Typography variant="caption" color="muted" className="shrink-0">
                    {formatarHora(eta.etaPrevista)}
                  </Typography>
                </div>
              ))}
            </div>
          ) : null}

          <Link
            href="/chamados/novo"
            className={buttonVariants({ variant: "secondary", size: "sm", fullWidth: true })}
          >
            <MessageCircle className="h-4 w-4" />
            Falar com a transportadora
          </Link>
        </div>
      </div>

      <div className="flex flex-col gap-4 p-6">
        <HistoricoEventosCard studentId={studentId} />
      </div>
    </div>
  );
}

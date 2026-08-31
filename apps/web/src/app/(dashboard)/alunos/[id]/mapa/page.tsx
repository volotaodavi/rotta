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
import { type RottaMapMarker } from "@rotta/maps/types";
import { Badge, Card, Spinner, Typography, buttonVariants } from "@rotta/ui/web";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";

import type { StudentEventsHistoryRange, TripStudentEventType } from "@rotta/api-client";

import { RottaMapLazy as RottaMap } from "@/components/rotta-map-lazy";
import { RecenterButton } from "@/components/route-screen-chrome";
import { useGpsForStudent, useStudentEventsHistory } from "@/features/gps/hooks/use-gps";
import { useNextStopTracedRoute } from "@/features/gps/hooks/use-next-stop-traced-route";
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
 * com/sem viagem ativa, com/sem prévia de rota). A aba ativa usa
 * `bg-success` (verde, cor de papel do Responsável nas 3 imagens de
 * referência) em vez do azul genérico — mesmo padrão do
 * `TRIP_STATUS_BADGE`/`Badge variant="success"` já usado nesta tela.
 */
function HistoricoEventosCard({ studentId }: { studentId: string }): JSX.Element {
  const [range, setRange] = useState<StudentEventsHistoryRange>("hoje");
  const { data: eventos, isLoading } = useStudentEventsHistory(studentId, range);

  return (
    <Card>
      <Card.Header
        title="Viagens"
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
                    ? "bg-success text-white"
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
    <Link href={`/alunos/${studentId}`} className="text-sm text-success hover:underline">
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
 *
 * Redesenho (Frente 301 — 3 imagens de referência anexadas pelo
 * usuário, pedido explícito "quero o mesmo design, idêntico"): o mapa
 * virou um CARTÃO compacto no topo de uma página que rola, igual à
 * referência do Responsável ("Viagem em andamento") — nenhuma delas usa
 * o mapa como fundo em tela cheia (Frente Q/P4 revertidas aqui).
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

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <VoltarLink studentId={studentId} nome={nome} />

      <Card className="overflow-hidden">
        <div className="relative h-52 w-full">
          <RottaMap key={mapKey} markers={markers} route={route ?? undefined} initialZoom={13} />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-end p-2">
            <RecenterButton onClick={() => setMapKey((k) => k + 1)} />
          </div>
        </div>
        <Card.Body className="flex flex-col gap-1.5">
          <Typography variant="subtitle">Rota até a escola</Typography>
          <Typography variant="bodySmall" color="muted">
            {isLoading
              ? "Traçando o trajeto…"
              : "Aparece aqui automaticamente assim que a viagem do dia começar. Esta página atualiza sozinha a cada 10 segundos."}
          </Typography>
        </Card.Body>
      </Card>

      <Card>
        <Card.Body className="flex gap-2">
          <div className="flex flex-1 flex-col items-start gap-0.5 rounded-xl bg-muted px-3 py-2">
            <Typography variant="caption" color="muted">
              Embarque de {nome ?? "aluno"}
            </Typography>
            {distanciaMetros !== null ? (
              <Typography variant="bodySmall" className="font-semibold leading-tight">
                {formatarDistancia(distanciaMetros)}
              </Typography>
            ) : null}
          </div>
          <div className="flex flex-1 flex-col items-start gap-0.5 rounded-xl bg-muted px-3 py-2">
            <Typography variant="caption" color="muted">
              {escolaNome}
            </Typography>
            {duracaoSegundos !== null ? (
              <Typography variant="bodySmall" className="font-semibold leading-tight">
                {formatarDuracao(duracaoSegundos)}
              </Typography>
            ) : null}
          </div>
        </Card.Body>
      </Card>
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
 * Redesenho (Frente 301 — 3 imagens de referência anexadas pelo
 * usuário, Responsável/Motorista/Monitor, pedido explícito "quero o
 * mesmo design, idêntico... com usabilidades, funcionando"): o mapa
 * passou de tela cheia com cartões flutuando por cima (Frente P4) para
 * um CARTÃO compacto no topo de uma página que rola normalmente — igual
 * à referência do Responsável ("Viagem em andamento"), que nunca mostra
 * o mapa ocupando a tela toda. `Badge variant="success"` (verde) já era
 * a cor certa pra este papel — só a estrutura da tela mudou.
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
        titulo: `${viagem.placa}: ${viagem.motoristaNome}`,
        latitude: viagem.latitude,
        longitude: viagem.longitude,
        emMovimento: true,
      },
    ];
  }, [viagem]);

  const proximaParada = proximasEtas?.[0];

  // A linha azul de verdade (pedido do usuário: "a linha azul é igual GPS
  // mesmo") — do transporte até a parada do próprio filho, seguindo as
  // ruas de verdade (OSRM). Mesmo hook usado em Motorista/Monitor, com o
  // veículo como origem — o Responsável enxerga exatamente o mesmo trajeto
  // que o motorista está seguindo agora. Chamado incondicionalmente (regra
  // dos hooks) — sem viagem/próxima parada ainda, os dois argumentos vêm
  // `null` e o hook simplesmente não busca nada.
  const tracedRoute = useNextStopTracedRoute(
    viagem?.latitude && viagem.longitude
      ? { latitude: viagem.latitude, longitude: viagem.longitude }
      : null,
    proximaParada ? { latitude: proximaParada.latitude, longitude: proximaParada.longitude } : null,
  );

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

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <VoltarLink studentId={studentId} nome={student?.nome} />

      {/*
        Mapa em CARTÃO, não em tela cheia (pedido do usuário: as 3
        imagens de referência anexadas nunca mostram o mapa como fundo
        da tela inteira — Frente Q/P4 revertidas nesta tela).
      */}
      <Card className="overflow-hidden">
        <div className="relative h-52 w-full">
          {markers.length > 0 ? (
            <RottaMap
              key={mapKey}
              markers={markers}
              route={tracedRoute.route ?? undefined}
              initialCenter={{ latitude: viagem.latitude!, longitude: viagem.longitude! }}
              initialZoom={14}
              // "Mapa em modo GPS" (Frente 4) — o Responsável acompanha o
              // veículo do próprio filho se movendo de verdade, sem
              // precisar tocar em "Recentralizar" a cada atualização.
              followMode
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-card">
              <Typography variant="bodySmall" color="muted">
                Aguardando a primeira posição do motorista…
              </Typography>
            </div>
          )}
          {markers.length > 0 && (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-end p-2">
              <RecenterButton onClick={() => setMapKey((k) => k + 1)} />
            </div>
          )}
        </div>
        <Card.Body className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between gap-3">
            <Badge variant="success">Em viagem agora</Badge>
            {proximaParada ? (
              <div className="flex items-center gap-1 text-success">
                <Clock size={14} />
                <Typography variant="bodySmall" className="font-semibold text-success">
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
                {viagem.placa}: {viagem.routeNome}
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
        </Card.Body>
      </Card>

      <HistoricoEventosCard studentId={studentId} />
    </div>
  );
}

"use client";

import { useAuth } from "@rotta/auth/web";
import { Calendar, Clock } from "@rotta/icons";
import { type RottaMapMarker } from "@rotta/maps/types";
import { Badge, Card, PanelGreeting, Spinner, Tabs, Typography } from "@rotta/ui/web";
import { useMemo, useState } from "react";

import { RottaMapLazy as RottaMap } from "@/components/rotta-map-lazy";
import { useMinhasRotas } from "@/features/driver/hooks/use-driver-routes";
import { useTripPositions } from "@/features/driver/hooks/use-driver-trip";
import { useTripHistory, type TripHistoryEntry } from "@/features/driver/hooks/use-trip-history";
import { TRIP_STATUS_BADGE } from "@/features/driver/trip-status";

type FiltroAba = "todas" | "concluidas" | "canceladas";

const TABS = [
  { id: "todas", label: "Todas" },
  { id: "concluidas", label: "Concluídas" },
  { id: "canceladas", label: "Canceladas" },
];

function filtrarPorAba(entradas: TripHistoryEntry[], aba: FiltroAba): TripHistoryEntry[] {
  if (aba === "concluidas") return entradas.filter((e) => e.trip.status === "FINALIZADA");
  if (aba === "canceladas") return entradas.filter((e) => e.trip.status === "CANCELADA");
  return entradas;
}

function formatarData(data: string): string {
  // `Trip.data` vem como "AAAA-MM-DD" (dia da viagem, sem horário) —
  // `new Date("AAAA-MM-DD")` interpretaria como UTC meia-noite e podia
  // exibir o dia anterior dependendo do fuso do navegador, por isso o
  // parse manual abaixo em vez de `new Date(data)` direto.
  const [ano, mes, dia] = data.split("-");
  if (!ano || !mes || !dia) return data;
  return `${dia}/${mes}/${ano}`;
}

function formatarHora(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

/**
 * "Atividades" (Frente K) — histórico de viagens do motorista/monitor
 * autônomo/MEI/funcionário, adaptado da aba "Activities" da imagem de
 * referência enviada pelo usuário ("Schedule/Recent/Completed/Canceled")
 * ao que a Rotta realmente tem: nenhuma viagem "agendada para o futuro"
 * existe no modelo de dados hoje (viagem nasce quando o motorista aperta
 * "Iniciar viagem" no dia — `TripsService.start`), então a aba
 * equivalente aqui é só "Todas" (o dia a dia real), sem fabricar um
 * conceito de agendamento que o backend não tem.
 *
 * Reaproveita `tripsApi.listByRoute` (histórico por rota, tarefa #100)
 * — já existia, nunca tinha ganhado uma tela própria no Painel Web.
 *
 * `PanelGreeting` (Frente N) — mesma harmonia visual do resto da
 * plataforma (Empresa/Admin, Frente L; app nativo, Frente M), faltava
 * aqui.
 */
/** Motorista usa `driverPrimary`, Monitor mantém `monitorAccent` — mesma decisão de escopo de "Minha Rota". */
function useAccentClassNames(): { text: string; activeTab: string } {
  const { user } = useAuth();
  const isMonitor = user?.role === "monitor";
  return {
    text: isMonitor ? "text-monitorAccent" : "text-driverPrimary",
    activeTab: isMonitor ? "bg-monitorAccent text-white" : "bg-driverPrimary text-white",
  };
}

export default function AtividadesPage(): JSX.Element {
  const { user } = useAuth();
  const accent = useAccentClassNames();
  const [aba, setAba] = useState<FiltroAba>("todas");
  const { data: rotasResult, isLoading: isLoadingRotas } = useMinhasRotas();
  const rotas = useMemo(() => rotasResult?.items ?? [], [rotasResult]);
  const { data: entradas, isLoading: isLoadingHistorico } = useTripHistory(rotas);

  const isLoading = isLoadingRotas || (rotas.length > 0 && isLoadingHistorico);
  const filtradas = filtrarPorAba(entradas, aba);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <PanelGreeting nome={user?.nome ?? ""} />

      <div>
        <Typography variant="title">Atividades</Typography>
        <Typography variant="bodySmall" color="muted">
          Histórico das suas viagens.
        </Typography>
      </div>

      <Tabs
        tabs={TABS}
        activeId={aba}
        onChange={(id) => setAba(id as FiltroAba)}
        activeClassName={accent.activeTab}
      />

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" className={accent.text} />
        </div>
      ) : filtradas.length === 0 ? (
        <Typography variant="bodySmall" color="muted" className="py-8 text-center">
          {rotas.length === 0
            ? "Você ainda não está vinculado a nenhuma rota."
            : "Nenhuma viagem encontrada nesta aba."}
        </Typography>
      ) : (
        <div className="flex flex-col gap-3">
          {filtradas.map((entrada) => (
            <AtividadeCard key={entrada.trip.id} entrada={entrada} />
          ))}
        </div>
      )}
    </div>
  );
}

function AtividadeCard({ entrada }: { entrada: TripHistoryEntry }): JSX.Element {
  const { trip, routeNome } = entrada;
  const inicio = formatarHora(trip.iniciadaEm);
  const fim = formatarHora(trip.finalizadaEm ?? trip.canceladaEm);
  const badge = TRIP_STATUS_BADGE[trip.status];

  // Preview da rota percorrida (Frente 3, pedido do usuário — "todos
  // deverão ter mapa") — só busca a trilha de posições pra viagens já
  // `FINALIZADA` (uma viagem cancelada pode nunca ter saído do lugar; em
  // andamento já tem o mapa ao vivo em "Minha Rota"). `GET
  // /trips/:id/positions` já libera Motorista/Monitor (`OPERATE_ROLES`).
  const { data: positions } = useTripPositions(trip.status === "FINALIZADA" ? trip.id : undefined);
  const rotaPercorrida = positions && positions.length >= 2 ? positions : null;

  return (
    <Card variant="driver">
      <Card.Body className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary/20 text-text-muted">
              <Calendar size={16} />
            </div>
            <div>
              <Typography variant="bodySmall" className="font-semibold">
                {routeNome}
              </Typography>
              <div className="flex items-center gap-1 text-text-muted">
                <Typography variant="caption" color="muted">
                  {formatarData(trip.data)}
                </Typography>
                {inicio ? (
                  <Typography variant="caption" color="muted" className="flex items-center gap-1">
                    <Clock size={12} /> {inicio}
                    {fim ? ` – ${fim}` : ""}
                  </Typography>
                ) : null}
              </div>
            </div>
          </div>
          <Badge variant={badge?.variant ?? "neutral"}>{badge?.label ?? trip.status}</Badge>
        </div>

        {rotaPercorrida ? <RotaPercorridaPreview positions={rotaPercorrida} /> : null}
      </Card.Body>
    </Card>
  );
}

/**
 * Miniatura estática da rota percorrida — nunca um mapa vazio/quebrado:
 * só renderiza quando `positions` já tem 2+ pontos (chamado de
 * `AtividadeCard`). Decorativo dentro da lista (sem `onBoundsChange`/
 * `onMarkerPress`, `pointer-events-none` — não compete com o scroll da
 * página); mesmo padrão ad-hoc de "embrulha `RottaMap` num container de
 * altura fixa" já usado em `MeuMapa`/`AcompanhamentoSection`, sem criar
 * componente novo em `packages/maps`/`packages/ui`.
 */
function RotaPercorridaPreview({
  positions,
}: {
  positions: NonNullable<ReturnType<typeof useTripPositions>["data"]>;
}): JSX.Element {
  const primeira = positions[0]!;
  const ultima = positions[positions.length - 1]!;
  const markers: RottaMapMarker[] = [
    { id: "inicio", titulo: "Início", latitude: primeira.latitude, longitude: primeira.longitude },
    { id: "fim", titulo: "Fim", latitude: ultima.latitude, longitude: ultima.longitude },
  ];
  const route = positions.map((p) => ({ latitude: p.latitude, longitude: p.longitude }));

  return (
    <div className="pointer-events-none h-[100px] overflow-hidden rounded-lg">
      <RottaMap markers={markers} route={route} />
    </div>
  );
}

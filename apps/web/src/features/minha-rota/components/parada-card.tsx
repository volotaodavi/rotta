"use client";

import { MOTIVO_AUSENCIA_PRESETS } from "@rotta/api-client";
import { Check, LogIn, LogOut, MapPin, UserX } from "@rotta/icons";
import {
  estaProximo,
  haversineDistanceMeters,
  type DistanceCoordenada,
} from "@rotta/maps/distance";
import { Badge, Button, Card, Input, Typography } from "@rotta/ui/web";
import { useState } from "react";

import type { RouteStop, RouteStudent, TripStudentEventType } from "@rotta/api-client";

import { useAddStudentEvent } from "@/features/driver/hooks/use-driver-trip";
import { formatarDistancia } from "@/features/minha-rota/labels";
import { useStudent } from "@/features/students/hooks/use-students";
import { useTripStudentLocations } from "@/features/trips/hooks/use-trips";

export function ParadaCard({
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
  /** Ausente de propósito (default vazio): a listagem "trip encerrada"
   * não precisa da sugestão de continuidade, já não há mais decisão a
   * tomar. */
  ausentesHojeIds?: Set<string>;
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
              ausenteNaIdaHoje={ausentesHojeIds?.has(aluno.studentId) ?? false}
            />
          ))
        )}
      </Card.Body>
    </Card>
  );
}

export function AlunoParadaRow({
  aluno,
  parada,
  eventos,
  tripId,
  podeOperar,
  driverPosition,
  ausenteNaIdaHoje = false,
}: {
  aluno: RouteStudent;
  parada: RouteStop;
  eventos: { studentId: string; tipo: TripStudentEventType }[];
  tripId: string;
  podeOperar: boolean;
  driverPosition: DistanceCoordenada | null;
  /**
   * "IA de continuidade" ida→volta — `true` quando este aluno já foi
   * marcado AUSENTE hoje em OUTRA viagem (a ida). Decisão do usuário:
   * "sugestão com 1 toque" — NUNCA marca ausência sozinho, só mostra o
   * aviso com um atalho; o botão de Embarque normal continua ativo do
   * lado, pro transportador decidir se o aluno voltou a aparecer.
   */
  ausenteNaIdaHoje?: boolean;
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

      {/* "IA de continuidade" ida→volta — só sugere, nunca registra
          sozinho. Some assim que o motorista/monitor tomar QUALQUER
          decisão sobre este aluno (embarque ou confirmar ausência). */}
      {isEmbarque && ausenteNaIdaHoje && !jaOcorreu && !jaAusente ? (
        <div className="flex items-center justify-between gap-2 rounded-2xl bg-warning/10 px-3 py-2">
          <div className="flex items-center gap-2">
            <Badge variant="warning">Ausente na ida</Badge>
            <Typography variant="caption" color="muted">
              Continua ausente ou embarcou pra voltar?
            </Typography>
          </div>
          <button
            type="button"
            disabled={!podeOperar || addEvent.isPending}
            onClick={() => addEvent.mutate({ studentId: aluno.studentId, tipo: "AUSENTE" })}
            className="shrink-0 text-xs font-semibold text-danger underline-offset-2 hover:underline disabled:opacity-40"
          >
            Confirmar ausência
          </button>
        </div>
      ) : null}

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

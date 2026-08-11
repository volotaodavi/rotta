"use client";

import { RottaMap, type RottaMapMarker } from "@rotta/maps/web";
import { Badge, Card, Spinner, Typography } from "@rotta/ui/web";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo } from "react";

import type { TripStudentEventType } from "@rotta/api-client";

import { useGpsForStudent } from "@/features/gps/hooks/use-gps";
import { useStudent } from "@/features/students/hooks/use-students";
import { useTripProximasEtas, useTripStudentEvents } from "@/features/trips/hooks/use-trips";

const EVENT_LABEL: Record<TripStudentEventType, string> = {
  EMBARCOU: "Embarcou",
  AUSENTE: "Marcado como ausente",
  DESEMBARCOU: "Desembarcou",
};

/**
 * "Meu Transporte" — localização em tempo real do transporte do aluno
 * (missão central da Rotta pro Responsável, GPS-01/03/06). `GET
 * /gps/students/:id` já existia e já tinha um hook web pronto
 * (`useGpsForStudent`) — só nenhuma tela consumia. Atualiza sozinho a
 * cada 10s, mesmo padrão do localizador de Empresa (`/veiculos/mapa`).
 *
 * Sem viagem em andamento: mensagem honesta, nunca um mapa vazio ou
 * fake (mesmo princípio do `AcompanhamentoSection` do app mobile).
 */
export default function AlunoMapaPage(): JSX.Element {
  const params = useParams<{ id: string }>();
  const studentId = params.id;
  const { data: student } = useStudent(studentId);
  const { data: viagem, isLoading } = useGpsForStudent(studentId);
  const { data: proximasEtas } = useTripProximasEtas(viagem?.tripId);
  const { data: eventos } = useTripStudentEvents(viagem?.tripId);

  const meusEventos = useMemo(
    () => (eventos ?? []).filter((event) => event.studentId === studentId),
    [eventos, studentId],
  );

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

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div>
        <Link href={`/alunos/${studentId}`} className="text-sm text-primary hover:underline">
          ← {student?.nome ?? "Aluno"}
        </Link>
        <Typography variant="title" className="mt-1">
          Localização em tempo real
        </Typography>
      </div>

      <Card className="overflow-hidden">
        <Card.Body className="flex flex-col gap-4">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Spinner size="lg" />
            </div>
          ) : !viagem ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <Typography variant="subtitle">Nenhum transporte em andamento agora</Typography>
              <Typography variant="bodySmall" color="muted" className="max-w-sm">
                O mapa aparece aqui automaticamente assim que a viagem do dia começar. Esta página
                atualiza sozinha a cada 10 segundos.
              </Typography>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-3">
                <Badge variant="success">Em viagem agora</Badge>
                <Typography variant="caption" color="muted">
                  {viagem.ultimaPosicaoEm
                    ? `Última posição: ${new Date(viagem.ultimaPosicaoEm).toLocaleTimeString("pt-BR")}`
                    : "Aguardando a primeira posição do motorista"}
                </Typography>
              </div>

              {markers.length > 0 && (
                <div style={{ height: 420 }}>
                  <RottaMap
                    markers={markers}
                    initialCenter={{ latitude: viagem.latitude!, longitude: viagem.longitude! }}
                    initialZoom={14}
                  />
                </div>
              )}

              <div className="grid grid-cols-1 gap-2 rounded-lg border border-border p-4 sm:grid-cols-2">
                <Detail label="Rota" value={`${viagem.routeNome} (${viagem.turno})`} />
                <Detail label="Veículo" value={viagem.placa} />
                <Detail label="Motorista" value={viagem.motoristaNome} />
                <Detail label="Monitor" value={viagem.monitorNome ?? "Sem monitor nesta viagem"} />
              </div>
            </>
          )}
        </Card.Body>
      </Card>

      {viagem && proximasEtas && proximasEtas.length > 0 && (
        <Card>
          <Card.Header title="Próximas paradas" />
          <Card.Body className="flex flex-col gap-3">
            {proximasEtas.map((eta) => (
              <div key={eta.routeStopId} className="flex items-center justify-between gap-3">
                <Typography variant="bodySmall">{eta.endereco}</Typography>
                <Typography variant="bodySmall" color="muted">
                  Chegada prevista às{" "}
                  {new Date(eta.etaPrevista).toLocaleTimeString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Typography>
              </div>
            ))}
          </Card.Body>
        </Card>
      )}

      {meusEventos.length > 0 && (
        <Card>
          <Card.Header title="Hoje" />
          <Card.Body className="flex flex-col gap-3">
            {meusEventos.map((event) => (
              <div key={event.id} className="flex items-center justify-between gap-3">
                <Typography variant="bodySmall">{EVENT_LABEL[event.tipo]}</Typography>
                <Typography variant="caption" color="muted">
                  {new Date(event.processadoEm).toLocaleTimeString("pt-BR")}
                </Typography>
              </div>
            ))}
          </Card.Body>
        </Card>
      )}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div>
      <Typography variant="caption" color="muted">
        {label}
      </Typography>
      <Typography variant="bodySmall">{value}</Typography>
    </div>
  );
}

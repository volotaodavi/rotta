"use client";

import { ApiError } from "@rotta/api-client";
import { Check, MapPin, Trash2, Users } from "@rotta/icons";
import { Badge, Button, Card, FormField, Input, Select, Spinner, Typography } from "@rotta/ui/web";
import { useParams } from "next/navigation";
import { useState } from "react";

import type { Contract, GeocodeResult, RouteStop, RouteStudent } from "@rotta/api-client";

import { useContractsList } from "@/features/marketplace/hooks/use-marketplace";
import {
  useAddRouteStop,
  useAddRouteStudent,
  useRemoveRouteStop,
  useRemoveRouteStudent,
  useRoute,
  useRouteStops,
  useRouteStudents,
} from "@/features/routes/hooks/use-routes";
import {
  ROUTE_STATUS_LABEL,
  ROUTE_STATUS_VARIANT,
  ROUTE_WEEKDAY_LABEL,
} from "@/features/routes/labels";
import { SCHOOL_SHIFT_LABEL } from "@/features/schools/labels";
import { useStudent } from "@/features/students/hooks/use-students";
import { useMyTeam } from "@/features/team/hooks/use-team";
import { geoApi } from "@/lib/api-client";


/**
 * Detalhe de Rota — paradas + alunos. Fecha o loop que faltava: sem uma
 * `RouteStop` real, não há onde embarcar/desembarcar ninguém; sem um
 * `RouteStudent`, o aluno credenciado (`Contract` ATIVO) nunca aparece
 * na rota do motorista nem no mapa do responsável. O endereço da parada
 * é geocodificado pela mesma Rotta Geo AI (`POST /geo/geocode`,
 * Nominatim/OSM) usada em todo o resto da plataforma — nunca lat/long
 * digitado manualmente.
 */
export default function RotaDetalhePage(): JSX.Element {
  const params = useParams<{ id: string }>();
  const routeId = params.id;

  const { data: route, isLoading: isLoadingRoute } = useRoute(routeId);
  const { data: stops, isLoading: isLoadingStops } = useRouteStops(routeId);
  const { data: routeStudents, isLoading: isLoadingStudents } = useRouteStudents(routeId);
  const { data: team } = useMyTeam();

  if (isLoadingRoute || !route) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size="lg" />
      </div>
    );
  }

  const motoristaNome = team?.find((m) => m.userId === route.motoristaPadraoId)?.nome;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Typography variant="title">{route.nome}</Typography>
          <Typography variant="bodySmall" color="muted">
            {SCHOOL_SHIFT_LABEL[route.turno]} ·{" "}
            {route.diasSemana.map((dia) => ROUTE_WEEKDAY_LABEL[dia].slice(0, 3)).join(", ")}
            {motoristaNome
              ? ` · Motorista: ${motoristaNome}`
              : " · Nenhum motorista atribuído ainda"}
          </Typography>
        </div>
        <Badge variant={ROUTE_STATUS_VARIANT[route.status]}>
          {ROUTE_STATUS_LABEL[route.status]}
        </Badge>
      </div>

      {!route.motoristaPadraoId ? (
        <Card>
          <Card.Body>
            <Typography variant="bodySmall" color="danger">
              Esta rota ainda não tem motorista atribuído — edite a rota (Equipe → vincular) antes
              de esperar que ela apareça em &quot;Minha Rota&quot; para alguém.
            </Typography>
          </Card.Body>
        </Card>
      ) : null}

      <StopsSection routeId={routeId} stops={stops} isLoading={isLoadingStops} />
      <StudentsSection
        routeId={routeId}
        stops={stops ?? []}
        routeStudents={routeStudents}
        isLoading={isLoadingStudents}
      />
    </div>
  );
}

function StopsSection({
  routeId,
  stops,
  isLoading,
}: {
  routeId: string;
  stops: RouteStop[] | undefined;
  isLoading: boolean;
}): JSX.Element {
  const addStop = useAddRouteStop(routeId);
  const removeStop = useRemoveRouteStop(routeId);
  const [endereco, setEndereco] = useState("");
  const [horario, setHorario] = useState("07:00");
  const [geocoded, setGeocoded] = useState<GeocodeResult | null>(null);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleBuscarEndereco(): Promise<void> {
    setGeocoded(null);
    setErrorMessage(null);
    if (!endereco.trim()) return;
    setIsGeocoding(true);
    try {
      const result = await geoApi.geocodeAddress(endereco);
      setGeocoded(result);
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError
          ? error.message
          : "Não foi possível localizar este endereço agora. Tente ser mais específico.",
      );
    } finally {
      setIsGeocoding(false);
    }
  }

  async function handleAdicionar(): Promise<void> {
    if (!geocoded) return;
    setErrorMessage(null);
    try {
      await addStop.mutateAsync({
        ordem: stops?.length ?? 0,
        endereco: geocoded.enderecoFormatado,
        latitude: geocoded.latitude,
        longitude: geocoded.longitude,
        horarioPrevisto: horario,
      });
      setEndereco("");
      setGeocoded(null);
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError ? error.message : "Não foi possível adicionar a parada agora.",
      );
    }
  }

  return (
    <Card>
      <Card.Header title="Paradas" />
      <Card.Body className="flex flex-col gap-4">
        {isLoading ? (
          <Spinner size="sm" />
        ) : !stops || stops.length === 0 ? (
          <Typography variant="bodySmall" color="muted">
            Nenhuma parada ainda — adicione ao menos uma antes de vincular alunos.
          </Typography>
        ) : (
          <div className="flex flex-col divide-y divide-border">
            {stops.map((stop) => (
              <div key={stop.id} className="flex items-center justify-between gap-3 py-2">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 shrink-0 text-primary" />
                  <div>
                    <Typography variant="bodySmall">{stop.endereco}</Typography>
                    <Typography variant="caption" color="muted">
                      {stop.horarioPrevisto}
                    </Typography>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  iconLeft={<Trash2 className="h-4 w-4" />}
                  isLoading={removeStop.isPending && removeStop.variables === stop.id}
                  onClick={() => removeStop.mutate(stop.id)}
                >
                  Remover
                </Button>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-col gap-3 rounded-2xl border border-border p-3">
          <FormField
            label="Endereço da parada"
            helperText="A Rotta Geo AI localiza a latitude/longitude sozinha — nunca digitada manualmente."
          >
            <Input
              placeholder="ex: Rua das Flores, 123 — Bela Vista, São Paulo, SP"
              value={endereco}
              onChange={(event) => {
                setEndereco(event.target.value);
                setGeocoded(null);
              }}
              onBlur={() => void handleBuscarEndereco()}
            />
          </FormField>
          {isGeocoding ? (
            <div className="flex items-center gap-2 text-text-muted">
              <Spinner size="sm" />
              <Typography variant="caption">Localizando endereço...</Typography>
            </div>
          ) : geocoded ? (
            <div className="flex items-center gap-2 text-success">
              <Check className="h-4 w-4" />
              <Typography variant="caption">{geocoded.enderecoFormatado}</Typography>
            </div>
          ) : null}
          <FormField label="Horário previsto">
            <Input
              type="time"
              value={horario}
              onChange={(event) => setHorario(event.target.value)}
            />
          </FormField>
          {errorMessage ? (
            <Typography variant="caption" color="danger">
              {errorMessage}
            </Typography>
          ) : null}
          <Button
            type="button"
            variant="secondary"
            disabled={!geocoded}
            isLoading={addStop.isPending}
            onClick={() => void handleAdicionar()}
          >
            Adicionar parada
          </Button>
        </div>
      </Card.Body>
    </Card>
  );
}

function StudentsSection({
  routeId,
  stops,
  routeStudents,
  isLoading,
}: {
  routeId: string;
  stops: RouteStop[];
  routeStudents: RouteStudent[] | undefined;
  isLoading: boolean;
}): JSX.Element {
  const removeStudent = useRemoveRouteStudent(routeId);
  const { data: contracts } = useContractsList({ pageSize: 100 });

  const jaNaRota = new Set(routeStudents?.map((rs) => rs.contractId));
  const candidatos = (contracts?.items ?? []).filter(
    (contract) => contract.status === "ATIVO" && !jaNaRota.has(contract.id),
  );

  return (
    <Card>
      <Card.Header title="Alunos" />
      <Card.Body className="flex flex-col gap-4">
        {isLoading ? (
          <Spinner size="sm" />
        ) : !routeStudents || routeStudents.length === 0 ? (
          <Typography variant="bodySmall" color="muted">
            Nenhum aluno vinculado a esta rota ainda.
          </Typography>
        ) : (
          <div className="flex flex-col divide-y divide-border">
            {routeStudents.map((rs) => (
              <RouteStudentRow
                key={rs.id}
                routeStudentId={rs.id}
                studentId={rs.studentId}
                onRemove={() => removeStudent.mutate(rs.id)}
                isRemoving={removeStudent.isPending && removeStudent.variables === rs.id}
              />
            ))}
          </div>
        )}

        {stops.length === 0 ? (
          <Typography variant="caption" color="muted">
            Adicione ao menos uma parada acima para poder vincular alunos.
          </Typography>
        ) : candidatos.length === 0 ? (
          <div className="flex items-center gap-2 text-text-muted">
            <Users className="h-4 w-4" />
            <Typography variant="caption">
              Nenhum aluno credenciado disponível pra vincular agora.
            </Typography>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <Typography variant="bodySmall" className="font-semibold">
              Alunos credenciados disponíveis
            </Typography>
            {candidatos.map((contract) => (
              <AddStudentCandidateRow
                key={contract.id}
                routeId={routeId}
                contract={contract}
                stops={stops}
              />
            ))}
          </div>
        )}
      </Card.Body>
    </Card>
  );
}

function RouteStudentRow({
  studentId,
  onRemove,
  isRemoving,
}: {
  routeStudentId: string;
  studentId: string;
  onRemove: () => void;
  isRemoving: boolean;
}): JSX.Element {
  const { data: student } = useStudent(studentId);

  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <Typography variant="bodySmall">{student?.nome ?? "Carregando..."}</Typography>
      <Button
        variant="ghost"
        size="sm"
        iconLeft={<Trash2 className="h-4 w-4" />}
        isLoading={isRemoving}
        onClick={onRemove}
      >
        Remover
      </Button>
    </div>
  );
}

function AddStudentCandidateRow({
  routeId,
  contract,
  stops,
}: {
  routeId: string;
  contract: Contract;
  stops: RouteStop[];
}): JSX.Element {
  const { data: student } = useStudent(contract.studentId);
  const addStudent = useAddRouteStudent(routeId);
  const [paradaEmbarqueId, setParadaEmbarqueId] = useState("");
  const [paradaDesembarqueId, setParadaDesembarqueId] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleAdd(): Promise<void> {
    setErrorMessage(null);
    if (!paradaEmbarqueId || !paradaDesembarqueId) {
      setErrorMessage("Escolha a parada de embarque e a de desembarque.");
      return;
    }
    try {
      await addStudent.mutateAsync({
        contractId: contract.id,
        paradaEmbarqueId,
        paradaDesembarqueId,
      });
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError ? error.message : "Não foi possível vincular este aluno agora.",
      );
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border p-3 sm:flex-row sm:items-center sm:justify-between">
      <Typography variant="bodySmall" className="font-medium">
        {student?.nome ?? "Carregando..."}
      </Typography>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Select
          value={paradaEmbarqueId}
          onChange={(event) => setParadaEmbarqueId(event.target.value)}
        >
          <option value="">Embarque em...</option>
          {stops.map((stop) => (
            <option key={stop.id} value={stop.id}>
              {stop.endereco} ({stop.horarioPrevisto})
            </option>
          ))}
        </Select>
        <Select
          value={paradaDesembarqueId}
          onChange={(event) => setParadaDesembarqueId(event.target.value)}
        >
          <option value="">Desembarque em...</option>
          {stops.map((stop) => (
            <option key={stop.id} value={stop.id}>
              {stop.endereco} ({stop.horarioPrevisto})
            </option>
          ))}
        </Select>
        <Button
          variant="secondary"
          size="sm"
          isLoading={addStudent.isPending}
          onClick={() => void handleAdd()}
        >
          Vincular
        </Button>
      </div>
      {errorMessage ? (
        <Typography variant="caption" color="danger">
          {errorMessage}
        </Typography>
      ) : null}
    </div>
  );
}

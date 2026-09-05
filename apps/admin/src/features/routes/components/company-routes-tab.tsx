"use client";

import {
  Button,
  Card,
  ErrorState,
  FormField,
  Input,
  Modal,
  Select,
  Spinner,
  Typography,
} from "@rotta/ui/web";
import { useState } from "react";

import {
  useAddRouteStop,
  useAddRouteStudent,
  useCompanyRoutes,
  useCreateRoute,
  useRouteStops,
  useRouteStudentsDetalhado,
  useStudentContract,
} from "../hooks/use-routes";

import type { CreateRouteInput, Route, RouteStop, SchoolShift } from "@rotta/api-client";

import { SCHOOL_SHIFT_LABEL } from "@/features/schools/labels";
import { useCompanyStudents } from "@/features/students/hooks/use-students";

const DIAS_SEMANA = [
  { value: "SEGUNDA", label: "Seg" },
  { value: "TERCA", label: "Ter" },
  { value: "QUARTA", label: "Qua" },
  { value: "QUINTA", label: "Qui" },
  { value: "SEXTA", label: "Sex" },
  { value: "SABADO", label: "Sáb" },
  { value: "DOMINGO", label: "Dom" },
] as const;

/**
 * "Empresas > Alunos > ... colocamos as respectivas escolas, rotas/
 * endereços residenciais" (pedido do usuário 02/09/2026) — a parte que
 * faltava depois da aba "Alunos": o Admin já podia gerenciar paradas e
 * alunos de uma rota (`MANAGE_ROLES` já incluía `ADMIN_ROTTA`), só
 * criar a rota em si exigia Empresa/Gestor — corrigido junto
 * (`RoutesController.CREATE_ROLES`).
 */
export function CompanyRoutesTab({ companyId }: { companyId: string }): JSX.Element {
  const { data, isLoading, isError, refetch, isFetching } = useCompanyRoutes(companyId);
  const [creating, setCreating] = useState(false);
  const [managing, setManaging] = useState<Route | null>(null);

  return (
    <Card>
      <Card.Header
        title="Rotas"
        action={
          <Button variant="primary" size="sm" onClick={() => setCreating(true)}>
            Nova rota
          </Button>
        }
      />

      {isLoading ? (
        <Card.Body className="flex items-center justify-center py-12">
          <Spinner size="lg" />
        </Card.Body>
      ) : isError ? (
        <Card.Body>
          <ErrorState
            message="Não foi possível carregar as rotas desta empresa."
            onRetry={() => void refetch()}
            isRetrying={isFetching}
          />
        </Card.Body>
      ) : data && data.items.length === 0 ? (
        <Card.Body>
          <Typography variant="body" color="muted">
            Nenhuma rota cadastrada ainda — clique em &ldquo;Nova rota&rdquo; pra começar.
          </Typography>
        </Card.Body>
      ) : (
        <div className="divide-y divide-border">
          {data?.items.map((route) => (
            <div
              key={route.id}
              className="flex flex-col gap-0.5 px-6 py-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <Typography variant="body" className="font-semibold">
                  {route.nome}
                </Typography>
                <Typography variant="caption" color="muted">
                  {SCHOOL_SHIFT_LABEL[route.turno]} · {route.diasSemana.join(", ")} · {route.status}
                </Typography>
              </div>
              <Button variant="secondary" size="sm" onClick={() => setManaging(route)}>
                Gerenciar
              </Button>
            </div>
          ))}
        </div>
      )}

      {creating && <NewRouteModal companyId={companyId} onClose={() => setCreating(false)} />}
      {managing && (
        <RouteDetailModal
          companyId={companyId}
          route={managing}
          onClose={() => setManaging(null)}
        />
      )}
    </Card>
  );
}

function NewRouteModal({
  companyId,
  onClose,
}: {
  companyId: string;
  onClose: () => void;
}): JSX.Element {
  const createRoute = useCreateRoute(companyId);
  const [nome, setNome] = useState("");
  const [turno, setTurno] = useState<SchoolShift>("MANHA");
  const [dias, setDias] = useState<Set<string>>(
    new Set(["SEGUNDA", "TERCA", "QUARTA", "QUINTA", "SEXTA"]),
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function toggleDia(dia: string): void {
    setDias((current) => {
      const next = new Set(current);
      if (next.has(dia)) next.delete(dia);
      else next.add(dia);
      return next;
    });
  }

  function handleSubmit(): void {
    setErrorMessage(null);
    if (!nome.trim() || dias.size === 0) {
      setErrorMessage("Informe o nome e ao menos um dia da semana.");
      return;
    }
    const input: Omit<CreateRouteInput, "companyId"> = {
      nome: nome.trim(),
      turno,
      diasSemana: [...dias] as CreateRouteInput["diasSemana"],
    };
    createRoute.mutate(input, {
      onSuccess: onClose,
      onError: (error) =>
        setErrorMessage(error instanceof Error ? error.message : "Erro ao criar a rota."),
    });
  }

  return (
    <Modal isOpen onClose={onClose}>
      <Modal.Header onClose={onClose}>Nova rota</Modal.Header>
      <Modal.Body className="flex flex-col gap-4">
        <FormField label="Nome da rota" isRequired>
          <Input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Ex.: Rota Manhã — Zona Norte"
          />
        </FormField>
        <FormField label="Turno">
          <Select value={turno} onChange={(e) => setTurno(e.target.value as SchoolShift)}>
            {Object.entries(SCHOOL_SHIFT_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </FormField>
        <div className="flex flex-col gap-1.5">
          <Typography variant="caption" className="font-semibold">
            Dias da semana
          </Typography>
          <div className="flex flex-wrap gap-1.5">
            {DIAS_SEMANA.map((dia) => (
              <button
                key={dia.value}
                type="button"
                onClick={() => toggleDia(dia.value)}
                className={`rounded-full border px-3 py-1 text-xs ${
                  dias.has(dia.value)
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-text-muted"
                }`}
              >
                {dia.label}
              </button>
            ))}
          </div>
        </div>
        {errorMessage && (
          <Typography variant="caption" color="danger">
            {errorMessage}
          </Typography>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
        <Button variant="primary" isLoading={createRoute.isPending} onClick={handleSubmit}>
          Salvar
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

function RouteDetailModal({
  companyId,
  route,
  onClose,
}: {
  companyId: string;
  route: Route;
  onClose: () => void;
}): JSX.Element {
  const { data: stops } = useRouteStops(route.id);
  const { data: students } = useRouteStudentsDetalhado(route.id);
  const addStop = useAddRouteStop(route.id);

  const [endereco, setEndereco] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [horario, setHorario] = useState("07:00");
  const [stopError, setStopError] = useState<string | null>(null);

  const [addingStudent, setAddingStudent] = useState(false);

  function handleAddStop(): void {
    setStopError(null);
    const lat = Number(latitude);
    const lng = Number(longitude);
    if (!endereco.trim() || !horario || Number.isNaN(lat) || Number.isNaN(lng)) {
      setStopError("Informe endereço, latitude, longitude e horário válidos.");
      return;
    }
    addStop.mutate(
      {
        ordem: (stops?.length ?? 0) + 1,
        endereco: endereco.trim(),
        latitude: lat,
        longitude: lng,
        horarioPrevisto: horario,
      },
      {
        onSuccess: () => {
          setEndereco("");
          setLatitude("");
          setLongitude("");
        },
        onError: (error) =>
          setStopError(error instanceof Error ? error.message : "Erro ao adicionar a parada."),
      },
    );
  }

  return (
    <Modal isOpen onClose={onClose}>
      <Modal.Header onClose={onClose}>{route.nome}</Modal.Header>
      <Modal.Body className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <Typography variant="subtitle">Paradas</Typography>
          {(stops ?? []).map((stop: RouteStop) => (
            <div key={stop.id} className="rounded-lg border border-border px-3 py-2">
              <Typography variant="bodySmall">
                {stop.ordem}. {stop.endereco}
              </Typography>
              <Typography variant="caption" color="muted">
                Previsto: {stop.horarioPrevisto}
              </Typography>
            </div>
          ))}
          {(stops ?? []).length === 0 && (
            <Typography variant="caption" color="muted">
              Nenhuma parada cadastrada ainda.
            </Typography>
          )}

          <div className="grid grid-cols-1 gap-2 rounded-lg border border-border p-3 sm:grid-cols-2">
            <Input
              placeholder="Endereço"
              className="sm:col-span-2"
              value={endereco}
              onChange={(e) => setEndereco(e.target.value)}
            />
            <Input
              placeholder="Latitude"
              value={latitude}
              onChange={(e) => setLatitude(e.target.value)}
            />
            <Input
              placeholder="Longitude"
              value={longitude}
              onChange={(e) => setLongitude(e.target.value)}
            />
            <Input type="time" value={horario} onChange={(e) => setHorario(e.target.value)} />
            <Button
              variant="secondary"
              size="sm"
              isLoading={addStop.isPending}
              onClick={handleAddStop}
            >
              Adicionar parada
            </Button>
          </div>
          {stopError && (
            <Typography variant="caption" color="danger">
              {stopError}
            </Typography>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <Typography variant="subtitle">Alunos</Typography>
            <Button variant="secondary" size="sm" onClick={() => setAddingStudent(true)}>
              Adicionar aluno
            </Button>
          </div>
          {(students ?? []).map((rs) => (
            <div key={rs.id} className="rounded-lg border border-border px-3 py-2">
              <Typography variant="bodySmall">{rs.studentNome ?? rs.studentId}</Typography>
              <Typography variant="caption" color="muted">
                {rs.schoolNome ?? ""} {rs.bairro ? `· ${rs.bairro}` : ""}
              </Typography>
            </div>
          ))}
          {(students ?? []).length === 0 && (
            <Typography variant="caption" color="muted">
              Nenhum aluno vinculado a esta rota ainda.
            </Typography>
          )}
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="ghost" onClick={onClose}>
          Fechar
        </Button>
      </Modal.Footer>

      {addingStudent && (
        <AddStudentToRouteModal
          companyId={companyId}
          route={route}
          stops={stops ?? []}
          onClose={() => setAddingStudent(false)}
        />
      )}
    </Modal>
  );
}

function AddStudentToRouteModal({
  companyId,
  route,
  stops,
  onClose,
}: {
  companyId: string;
  route: Route;
  stops: RouteStop[];
  onClose: () => void;
}): JSX.Element {
  const { data: companyStudents } = useCompanyStudents(companyId);
  const [studentId, setStudentId] = useState("");
  const [paradaEmbarqueId, setParadaEmbarqueId] = useState("");
  const [paradaDesembarqueId, setParadaDesembarqueId] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data: contract, isLoading: isLoadingContract } = useStudentContract(
    companyId,
    studentId || null,
  );
  const addStudent = useAddRouteStudent(route.id);

  function handleSubmit(): void {
    setErrorMessage(null);
    if (!contract) {
      setErrorMessage(
        "Este aluno ainda não tem um contrato ativo com a empresa — credencie-o primeiro (aba Alunos).",
      );
      return;
    }
    if (!paradaEmbarqueId || !paradaDesembarqueId) {
      setErrorMessage("Escolha a parada de embarque e a de desembarque.");
      return;
    }
    addStudent.mutate(
      { contractId: contract.id, paradaEmbarqueId, paradaDesembarqueId },
      {
        onSuccess: onClose,
        onError: (error) =>
          setErrorMessage(error instanceof Error ? error.message : "Erro ao vincular o aluno."),
      },
    );
  }

  return (
    <Modal isOpen onClose={onClose}>
      <Modal.Header onClose={onClose}>Adicionar aluno à rota</Modal.Header>
      <Modal.Body className="flex flex-col gap-3">
        <FormField label="Aluno" isRequired>
          <Select value={studentId} onChange={(e) => setStudentId(e.target.value)}>
            <option value="">Selecione...</option>
            {(companyStudents?.items ?? []).map((student) => (
              <option key={student.id} value={student.id}>
                {student.nome}
              </option>
            ))}
          </Select>
        </FormField>
        {studentId && isLoadingContract && (
          <Typography variant="caption" color="muted">
            Verificando contrato do aluno...
          </Typography>
        )}
        {studentId && !isLoadingContract && !contract && (
          <Typography variant="caption" color="danger">
            Aluno sem contrato ativo com esta empresa — credencie-o primeiro na aba Alunos.
          </Typography>
        )}
        <FormField label="Parada de embarque" isRequired>
          <Select value={paradaEmbarqueId} onChange={(e) => setParadaEmbarqueId(e.target.value)}>
            <option value="">Selecione...</option>
            {stops.map((stop) => (
              <option key={stop.id} value={stop.id}>
                {stop.ordem}. {stop.endereco}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Parada de desembarque" isRequired>
          <Select
            value={paradaDesembarqueId}
            onChange={(e) => setParadaDesembarqueId(e.target.value)}
          >
            <option value="">Selecione...</option>
            {stops.map((stop) => (
              <option key={stop.id} value={stop.id}>
                {stop.ordem}. {stop.endereco}
              </option>
            ))}
          </Select>
        </FormField>
        {errorMessage && (
          <Typography variant="caption" color="danger">
            {errorMessage}
          </Typography>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
        <Button variant="primary" isLoading={addStudent.isPending} onClick={handleSubmit}>
          Vincular
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

"use client";

import { ApiError } from "@rotta/api-client";
import { FileText, Trash2, Users } from "@rotta/icons";
import { Badge, Button, Card, Select, Spinner, Typography } from "@rotta/ui/web";
import { useState } from "react";

import type { Contract, RouteStop, RouteStudent, SchoolShift } from "@rotta/api-client";

import { useContractsList } from "@/features/marketplace/hooks/use-marketplace";
import { useAddRouteStudent, useRemoveRouteStudent } from "@/features/routes/hooks/use-routes";
import { SCHOOL_SHIFT_LABEL } from "@/features/schools/labels";
import { useStudent } from "@/features/students/hooks/use-students";
import { marketplaceApi } from "@/lib/api-client";

export function StudentsSection({
  routeId,
  routeTurno,
  stops,
  routeStudents,
  isLoading,
}: {
  routeId: string;
  routeTurno: SchoolShift;
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
                routeTurno={routeTurno}
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
  studentId: string;
  onRemove: () => void;
  isRemoving: boolean;
}): JSX.Element {
  const { data: student } = useStudent(studentId);

  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <div className="flex items-center gap-2">
        <Typography variant="bodySmall">{student?.nome ?? "Carregando..."}</Typography>
        {student && <Badge variant="neutral">{SCHOOL_SHIFT_LABEL[student.turno]}</Badge>}
      </div>
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

/**
 * Pedido do usuário: "após criar uma rota, deverá ter ali os alunos que
 * estão cadastrados no código da transportadora e credenciar a uma rota
 * (manhã, tarde e noite)." O turno da rota é fixo (definido em
 * `/rotas/novo`); o que faltava era o turno de CADA aluno candidato
 * ficar visível aqui, pra quem credencia ver de cara se o horário bate
 * — nunca escondido, pra não esconder por engano um candidato válido
 * (ex. aluno turno INTEGRAL serve pra qualquer rota).
 */
function AddStudentCandidateRow({
  routeId,
  routeTurno,
  contract,
  stops,
}: {
  routeId: string;
  routeTurno: SchoolShift;
  contract: Contract;
  stops: RouteStop[];
}): JSX.Element {
  const { data: student } = useStudent(contract.studentId);
  const turnoCompativel =
    !student ||
    student.turno === routeTurno ||
    student.turno === "INTEGRAL" ||
    routeTurno === "INTEGRAL" ||
    routeTurno === "PERSONALIZADO";
  const addStudent = useAddRouteStudent(routeId);
  const [paradaEmbarqueId, setParadaEmbarqueId] = useState("");
  const [paradaDesembarqueId, setParadaDesembarqueId] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isBaixandoTermo, setIsBaixandoTermo] = useState(false);

  /**
   * Só aparece pra contratos gerados automaticamente no credenciamento
   * pelo "código do transporte" (`origem: TERMO_CIENCIA_AUTOMATICO`,
   * ver nota do model Prisma) — um contrato `NEGOCIADO` de verdade segue
   * pela Authentique, sem PDF de termo de ciência. Blob autenticado
   * (mesmo padrão de `escolas/page.tsx.handleExport`), nunca um `<a
   * href>` cru — a rota exige o Bearer token do usuário logado.
   */
  async function handleBaixarTermo(): Promise<void> {
    setIsBaixandoTermo(true);
    try {
      const blob = await marketplaceApi.baixarTermoCienciaPdf(contract.id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `termo-ciencia-${contract.id}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      setErrorMessage("Não foi possível baixar o termo de ciência agora.");
    } finally {
      setIsBaixandoTermo(false);
    }
  }

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
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <Typography variant="bodySmall" className="font-medium">
            {student?.nome ?? "Carregando..."}
          </Typography>
          {student && (
            <Badge variant={turnoCompativel ? "neutral" : "warning"}>
              {SCHOOL_SHIFT_LABEL[student.turno]}
            </Badge>
          )}
        </div>
        {student && !turnoCompativel && (
          <Typography variant="caption" color="danger">
            Turno diferente do turno desta rota ({SCHOOL_SHIFT_LABEL[routeTurno]}), confira antes de
            credenciar.
          </Typography>
        )}
        {contract.origem === "TERMO_CIENCIA_AUTOMATICO" ? (
          <button
            type="button"
            onClick={() => void handleBaixarTermo()}
            disabled={isBaixandoTermo}
            className="flex w-fit items-center gap-1 text-xs text-text-muted underline decoration-dotted hover:text-primary disabled:opacity-60"
          >
            <FileText className="h-3.5 w-3.5" />
            {isBaixandoTermo ? "Baixando termo..." : "Baixar termo de ciência"}
          </button>
        ) : null}
      </div>
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

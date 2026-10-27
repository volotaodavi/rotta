"use client";

import { Users } from "@rotta/icons";
import { Card, Typography } from "@rotta/ui/web";

import type { RoleAccent } from "@/features/minha-rota/labels";
import type { RouteStudent, TripStudentEventType } from "@rotta/api-client";

import { useStudent } from "@/features/students/hooks/use-students";

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
export function AlunosABordoCard({
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

export function AlunoABordoRow({ studentId }: { studentId: string }): JSX.Element {
  const { data: student } = useStudent(studentId);
  return (
    <div className="flex items-center gap-2 border-t border-border pt-2 first:border-t-0 first:pt-0">
      <span className="h-2 w-2 shrink-0 rounded-full bg-success" />
      <Typography variant="bodySmall">{student?.nome ?? "Carregando…"}</Typography>
    </div>
  );
}

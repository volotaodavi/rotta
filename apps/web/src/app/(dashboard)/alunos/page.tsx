"use client";

import { KeyRound, MapPin, Plus, Radio } from "@rotta/icons";
import { RottaMap, type RottaMapMarker } from "@rotta/maps/web";
import { Badge, Card, Input, Spinner, Typography, buttonVariants } from "@rotta/ui/web";
import Link from "next/link";
import { useMemo, useState } from "react";

import type { Student } from "@rotta/api-client";

import { useGpsForStudent, useGpsForStudents } from "@/features/gps/hooks/use-gps";
import { SCHOOL_SHIFT_LABEL } from "@/features/schools/labels";
import { useStudentsList } from "@/features/students/hooks/use-students";

/**
 * "Meus Alunos" (briefing "Marketplace" §"CADASTRO DO ALUNO" — home do
 * Responsável no Painel Web). Até esta entrega, NENHUMA tela em nenhuma
 * plataforma (web/mobile/admin) chamava `studentsApi.create` — o
 * cadastro de aluno só existia como endpoint de backend, sem porta de
 * entrada nenhuma. Esta lista é o ponto de partida real da missão da
 * Rotta pro Responsável: cada aluno mostra, ao vivo, se o transporte
 * dele está em movimento agora (`useGpsForStudent` — já existia como
 * hook, só nunca tinha sido usado por nenhuma tela web).
 */
export default function AlunosPage(): JSX.Element {
  const [search, setSearch] = useState("");
  const { data, isLoading } = useStudentsList({ search: search || undefined, pageSize: 50 });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Typography variant="title">Meus Alunos</Typography>
          <Typography variant="bodySmall" color="muted">
            Acompanhe o transporte de cada um em tempo real.
          </Typography>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/vincular-transporte" className={buttonVariants({ variant: "secondary" })}>
            <KeyRound className="h-4 w-4" />
            Tenho um código de transporte
          </Link>
          <Link href="/alunos/novo" className={buttonVariants({ variant: "primary" })}>
            <Plus className="h-4 w-4" />
            Adicionar aluno
          </Link>
        </div>
      </div>

      {data && data.items.length > 0 ? <MapaAoVivoWidget students={data.items} /> : null}

      <Input
        placeholder="Buscar por nome"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        className="max-w-sm"
      />

      {isLoading || !data ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : data.items.length === 0 ? (
        <Card>
          <Card.Body className="flex flex-col items-center gap-3 py-12 text-center">
            <Typography variant="subtitle">Nenhum aluno cadastrado ainda</Typography>
            <Typography variant="bodySmall" color="muted" className="max-w-sm">
              Cadastre seu filho ou dependente para acompanhar o transporte escolar dele em tempo
              real assim que a viagem começar.
            </Typography>
            <div className="flex flex-wrap justify-center gap-2">
              <Link
                href="/vincular-transporte"
                className={buttonVariants({ variant: "secondary" })}
              >
                <KeyRound className="h-4 w-4" />
                Tenho um código de transporte
              </Link>
              <Link href="/alunos/novo" className={buttonVariants({ variant: "primary" })}>
                <Plus className="h-4 w-4" />
                Adicionar aluno
              </Link>
            </div>
          </Card.Body>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.items.map((student) => (
            <StudentCard key={student.id} student={student} />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Mapa combinado no topo de "Meus Alunos" — antes desta entrega, a
 * única forma de ver a posição de um filho era abrir `/alunos/:id/mapa`
 * um de cada vez; quem tem mais de um filho não enxergava os dois ao
 * mesmo tempo. Só aparece quando pelo menos um tem viagem em curso
 * agora — sem viagem nenhuma, o mapa vazio só ocuparia espaço à toa
 * (os badges "Sem viagem agora" nos cards abaixo já cobrem esse caso).
 */
function MapaAoVivoWidget({ students }: { students: Student[] }): JSX.Element | null {
  const { data: emViagem } = useGpsForStudents(students.map((s) => ({ id: s.id, nome: s.nome })));

  const markers = useMemo<RottaMapMarker[]>(
    () =>
      emViagem
        .filter((row): row is typeof row & { vehicle: { latitude: number; longitude: number } } =>
          Boolean(row.vehicle.latitude && row.vehicle.longitude),
        )
        .map((row) => ({
          id: row.vehicle.tripId,
          titulo: `${row.student.nome}, ${row.vehicle.routeNome} (${row.vehicle.motoristaNome})`,
          latitude: row.vehicle.latitude,
          longitude: row.vehicle.longitude,
          emMovimento: true,
        })),
    [emViagem],
  );

  if (markers.length === 0) return null;

  return (
    <Card>
      <Card.Header title={`${markers.length} em viagem agora`} />
      <Card.Body>
        <div style={{ height: 320 }}>
          <RottaMap markers={markers} />
        </div>
      </Card.Body>
    </Card>
  );
}

function StudentCard({ student }: { student: Student }): JSX.Element {
  const { data: viagem, isLoading } = useGpsForStudent(student.id);

  return (
    <Link href={`/alunos/${student.id}/mapa`}>
      <Card interactive className="h-full transition-shadow duration-150 hover:shadow-lg">
        <Card.Body className="flex flex-col gap-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <Typography variant="subtitle">{student.nome}</Typography>
              <Typography variant="caption" color="muted">
                {SCHOOL_SHIFT_LABEL[student.turno]}
              </Typography>
            </div>
            {!isLoading &&
              (viagem ? (
                <Badge variant="success">
                  <Radio className="mr-1 inline h-3 w-3" />
                  Em viagem
                </Badge>
              ) : (
                <Badge variant="neutral">Sem viagem agora</Badge>
              ))}
          </div>
          <div className="flex items-center gap-1.5 text-text-muted">
            <MapPin className="h-3.5 w-3.5" />
            <Typography variant="caption" color="muted">
              {viagem ? `${viagem.routeNome} (${viagem.motoristaNome})` : "Toque para ver o mapa"}
            </Typography>
          </div>
        </Card.Body>
      </Card>
    </Link>
  );
}

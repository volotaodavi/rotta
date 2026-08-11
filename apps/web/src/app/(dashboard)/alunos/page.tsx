"use client";

import { MapPin, Plus, Radio } from "@rotta/icons";
import { Badge, Button, Card, Input, Spinner, Typography } from "@rotta/ui/web";
import Link from "next/link";
import { useState } from "react";

import type { Student } from "@rotta/api-client";

import { useGpsForStudent } from "@/features/gps/hooks/use-gps";
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
      <div className="flex items-center justify-between">
        <div>
          <Typography variant="title">Meus Alunos</Typography>
          <Typography variant="bodySmall" color="muted">
            Acompanhe o transporte de cada um em tempo real.
          </Typography>
        </div>
        <Link href="/alunos/novo">
          <Button variant="primary" iconLeft={<Plus className="h-4 w-4" />}>
            Adicionar aluno
          </Button>
        </Link>
      </div>

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
            <Link href="/alunos/novo">
              <Button variant="primary" iconLeft={<Plus className="h-4 w-4" />}>
                Adicionar aluno
              </Button>
            </Link>
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
              {viagem ? `${viagem.routeNome} — ${viagem.motoristaNome}` : "Toque para ver o mapa"}
            </Typography>
          </div>
        </Card.Body>
      </Card>
    </Link>
  );
}

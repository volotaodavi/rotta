"use client";

import { Typography } from "@rotta/ui/web";

import type { RouteStudentDetalhado } from "@rotta/api-client";

/**
 * Uma linha por aluno no card "Próxima viagem" (pedido do usuário:
 * "aparecerá as informações — nome dos alunos, escolas, horário,
 * bairros, responsáveis"). Todo campo de `RouteStudentDetalhado` é
 * opcional (join que pode falhar isoladamente no backend) — nunca
 * mostra um traço genérico, só omite a informação que não veio.
 */
export function AlunoPreViagemRow({ aluno }: { aluno: RouteStudentDetalhado }): JSX.Element {
  return (
    <div className="flex flex-col gap-0.5 rounded-xl bg-muted px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <Typography variant="bodySmall" className="font-semibold leading-tight">
          {aluno.studentNome ?? "Aluno"}
        </Typography>
        {aluno.horarioPrevisto ? (
          <Typography variant="caption" color="muted">
            {aluno.horarioPrevisto}
          </Typography>
        ) : null}
      </div>
      <Typography variant="caption" color="muted">
        {[aluno.schoolNome, aluno.bairro].filter(Boolean).join(" · ")}
      </Typography>
      {aluno.responsavelNome ? (
        <Typography variant="caption" color="muted">
          Responsável: {aluno.responsavelNome}
        </Typography>
      ) : null}
    </div>
  );
}

/** Mensagem exata já usada no popup de suporte pós-CNH — mesmo canal real, aqui só o contexto muda (motorista pedindo ajuda durante a operação, não logo após a verificação). */

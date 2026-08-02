"use client";

import { Button, Typography } from "@rotta/ui/web";
import Link from "next/link";

/**
 * Área Pessoal (Responsável) — nunca um cadastro self-service: a conta
 * é sempre ativada por um convite emitido pela escola/empresa que já
 * tem o(s) aluno(s) cadastrado(s) (Dossiê 15, `AUTH-01-A1`).
 */
export default function AreaPessoalPage(): JSX.Element {
  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-6 text-center">
      <Typography variant="title">Área Pessoal</Typography>
      <Typography variant="body" color="muted">
        Contas de Responsável são ativadas por um convite enviado pela escola ou empresa de
        transporte responsável pelo seu filho(a). Se você já recebeu um código, informe-o a seguir.
      </Typography>
      <Link href="/convite">
        <Button variant="primary" fullWidth>
          Já fui convidado
        </Button>
      </Link>
    </div>
  );
}

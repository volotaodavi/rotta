"use client";

import { Card, Typography } from "@rotta/ui/web";
import Link from "next/link";

/**
 * "Como deseja utilizar a Rotta?" (briefing "Criar Conta") — primeira
 * bifurcação do cadastro: Área Profissional (Empresa/MEI/Autônomo) ou
 * Área Pessoal (Responsável, sempre ativada por convite — `AUTH-01-A1`).
 */
export default function CriarContaPage(): JSX.Element {
  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-6">
      <div className="flex flex-col gap-1 text-center">
        <Typography variant="title">Como deseja utilizar a Rotta?</Typography>
      </div>

      <div className="flex flex-col gap-3">
        <Link href="/criar-conta/profissional">
          <Card interactive className="px-6 py-5">
            <Typography variant="subtitle">Área Profissional</Typography>
            <Typography variant="bodySmall" color="muted">
              Empresa, MEI ou motorista autônomo.
            </Typography>
          </Card>
        </Link>

        <Link href="/criar-conta/pessoal">
          <Card interactive className="px-6 py-5">
            <Typography variant="subtitle">Área Pessoal</Typography>
            <Typography variant="bodySmall" color="muted">
              Responsável de aluno(s) já matriculado(s).
            </Typography>
          </Card>
        </Link>
      </div>
    </div>
  );
}

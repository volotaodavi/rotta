"use client";

import { Card, Typography } from "@rotta/ui/web";
import Link from "next/link";

/**
 * Área Profissional (briefing "Criar Conta") — "Criar Empresa" ou
 * "Já fui convidado por uma empresa" (motorista/gestor/monitor
 * convidados nunca criam uma empresa nova, `AUTH-01-A1`).
 */
export default function AreaProfissionalPage(): JSX.Element {
  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-6">
      <div className="flex flex-col gap-1 text-center">
        <Typography variant="title">Área Profissional</Typography>
      </div>

      <div className="flex flex-col gap-3">
        <Link href="/criar-conta/empresa">
          <Card interactive className="px-6 py-5">
            <Typography variant="subtitle">Criar Empresa</Typography>
            <Typography variant="bodySmall" color="muted">
              Cadastre sua empresa, MEI ou atue como motorista autônomo.
            </Typography>
          </Card>
        </Link>

        <Link href="/convite">
          <Card interactive className="px-6 py-5">
            <Typography variant="subtitle">Já fui convidado</Typography>
            <Typography variant="bodySmall" color="muted">
              Tenho um código de convite de uma empresa.
            </Typography>
          </Card>
        </Link>
      </div>
    </div>
  );
}

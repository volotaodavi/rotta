"use client";

import { AlertTriangle } from "@rotta/icons";
import { buttonVariants } from "@rotta/ui/web";
import Link from "next/link";

import type { RoleAccent } from "@/features/minha-rota/labels";
import type { Route as NextRoute } from "next";

/**
 * "Registrar ocorrência" (modelo de referência — tela do Monitor) —
 * link pra uma página CHEIA dedicada (`/ocorrencia`), não mais um
 * `Modal` por cima da viagem ativa. Mesma ideia das 3 imagens de
 * referência do usuário, que sempre mostram "Ocorrência" como tela
 * própria, nunca uma janela flutuante. Backend inalterado (`POST
 * /vehicles/:id/occurrences`, já libera MOTORISTA/MONITOR).
 */
export function RegistrarOcorrenciaButton({
  veiculoId,
  accent,
}: {
  veiculoId: string;
  accent: RoleAccent;
}): JSX.Element {
  return (
    <Link
      href={`/ocorrencia?veiculoId=${veiculoId}` as NextRoute}
      className={buttonVariants({ variant: "secondary", className: `self-start ${accent.text}` })}
    >
      <AlertTriangle size={16} />
      Registrar ocorrência
    </Link>
  );
}

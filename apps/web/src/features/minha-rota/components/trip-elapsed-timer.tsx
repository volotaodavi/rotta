"use client";

import { Timer } from "@rotta/icons";
import { Typography } from "@rotta/ui/web";
import { useEffect, useState } from "react";

import type { RoleAccent } from "@/features/minha-rota/labels";

/**
 * Cronômetro da viagem ativa (pedido do usuário — modelo de referência
 * "Viagem ativa": grande, contando desde o início) — conta a partir de
 * `trip.iniciadaEm`, o mesmo timestamp real já gravado pelo backend
 * (nunca um relógio "de mentira" começando em zero visualmente).
 * Atualiza a cada segundo enquanto a viagem está `EM_ANDAMENTO`; parado
 * (não incrementa) quando `PAUSADA`, mostrando o tempo decorrido até a
 * pausa.
 */
export function TripElapsedTimer({
  iniciadaEm,
  isRunning,
  accent,
}: {
  iniciadaEm: string;
  isRunning: boolean;
  accent: RoleAccent;
}): JSX.Element {
  const [agora, setAgora] = useState(() => Date.now());

  useEffect(() => {
    if (!isRunning) return;
    const id = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(id);
  }, [isRunning]);

  const decorridoMs = Math.max(0, agora - new Date(iniciadaEm).getTime());
  const totalSegundos = Math.floor(decorridoMs / 1000);
  const horas = Math.floor(totalSegundos / 3600);
  const minutos = Math.floor((totalSegundos % 3600) / 60);
  const segundos = totalSegundos % 60;
  const texto =
    horas > 0
      ? `${horas}:${String(minutos).padStart(2, "0")}:${String(segundos).padStart(2, "0")}`
      : `${minutos}:${String(segundos).padStart(2, "0")}`;

  return (
    <div className="flex items-center gap-2 text-text">
      <Timer size={20} className={isRunning ? accent.text : "text-text-muted"} />
      <Typography variant="display" className="font-mono leading-none tabular-nums">
        {texto}
      </Typography>
      {!isRunning ? (
        <Typography variant="caption" color="muted">
          pausada
        </Typography>
      ) : null}
    </div>
  );
}

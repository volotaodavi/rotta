"use client";

import { AlertTriangle, Bus, Route, UserRound, UsersRound } from "@rotta/icons";
import { StatTile, Typography } from "@rotta/ui/web";

import type { IndicadoresDoPainel } from "@rotta/api-client";

/**
 * Os cinco contadores do topo.
 *
 * Cada um é "quantos de quantos", porque um número sozinho não diz
 * nada ao despachante: 18 veículos é tranquilidade numa frota de 18 e
 * é problema numa frota de 40. Quando não existe denominador honesto
 * (ocorrências do dia), o tile mostra só o número, em vez de inventar
 * um total para a linha ficar simétrica.
 */
export function IndicadoresDoPainelGeral({
  indicadores,
}: {
  indicadores: IndicadoresDoPainel;
}): JSX.Element {
  const tiles = [
    {
      icon: Bus,
      tone: "primary" as const,
      label: "Veículos em operação",
      indicador: indicadores.veiculosEmOperacao,
    },
    {
      icon: Route,
      tone: "info" as const,
      label: "Rotas em andamento",
      indicador: indicadores.rotasEmAndamento,
    },
    {
      icon: UserRound,
      tone: "primary" as const,
      label: "Motoristas em atividade",
      indicador: indicadores.motoristasEmAtividade,
    },
    {
      icon: UsersRound,
      tone: "info" as const,
      label: "Monitores em atividade",
      indicador: indicadores.monitoresEmAtividade,
    },
    {
      icon: AlertTriangle,
      tone: indicadores.ocorrenciasHoje.atual > 0 ? ("danger" as const) : ("success" as const),
      label: "Ocorrências hoje",
      indicador: indicadores.ocorrenciasHoje,
    },
  ];

  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {tiles.map((tile) => (
          <StatTile
            key={tile.label}
            icon={tile.icon}
            tone={tile.tone}
            label={tile.label}
            iconShape="square"
            value={
              <span className="flex items-baseline gap-1.5 tabular-nums">
                <span>{tile.indicador.atual}</span>
                {tile.indicador.total === null ? null : (
                  <span className="text-base font-medium text-text-muted">
                    de {tile.indicador.total}
                  </span>
                )}
              </span>
            }
          />
        ))}
      </div>

      {/*
        A frota sem rastreador não é um indicador do dia: é uma
        pendência de equipamento. Aparece como uma linha discreta
        embaixo, e some quando o número é zero — um aviso permanente
        que nunca muda vira ruído e para de ser lido.
      */}
      {indicadores.veiculosSemRastreador > 0 ? (
        <Typography variant="caption" color="muted">
          {indicadores.veiculosSemRastreador}{" "}
          {indicadores.veiculosSemRastreador === 1
            ? "veículo ainda não tem"
            : "veículos ainda não têm"}{" "}
          rastreador vinculado. Enquanto não tiverem, a posição deles não aparece no mapa nem para
          as famílias.
        </Typography>
      ) : null}
    </div>
  );
}

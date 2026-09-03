"use client";

import { useId } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { chartGridStroke } from "./chart-theme";
import { ChartTooltipContent } from "./ChartTooltipContent";

export interface TrendAreaChartPoint {
  label: string;
  value: number;
}

export interface TrendAreaChartProps {
  data: TrendAreaChartPoint[];
  color?: string;
  height?: number;
  valueFormatter?: (value: number) => string;
  seriesName?: string;
}

/**
 * Curva de UM valor ao longo do tempo — pensado pro saldo de uma conta
 * ponto a ponto real do extrato (nunca uma série histórica inventada;
 * quando não há pontos suficientes, quem chama isto simplesmente não
 * renderiza o gráfico, ver `asaas-account-section.tsx`). Preenchimento
 * em gradiente sutil na cor do token — mesma disciplina de
 * `TrendBarChart` (cor sempre via variável CSS, nunca hex solto),
 * pensado pra caber discreto dentro de um card (sem eixo, sem grid),
 * tipo "sparkline" de dashboard bancário.
 */
export function TrendAreaChart({
  data,
  color = "rgb(var(--color-primary))",
  height = 72,
  valueFormatter,
  seriesName = "Valor",
}: TrendAreaChartProps) {
  const gradientId = `trend-area-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey="label" hide />
        <YAxis hide domain={["dataMin", "dataMax"]} />
        <Tooltip
          content={<ChartTooltipContent valueFormatter={valueFormatter} />}
          cursor={{ stroke: chartGridStroke, strokeDasharray: "3 3" }}
        />
        <Area
          type="monotone"
          dataKey="value"
          name={seriesName}
          stroke={color}
          strokeWidth={2}
          fill={`url(#${gradientId})`}
          dot={false}
          activeDot={{ r: 3 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

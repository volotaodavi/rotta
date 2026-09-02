"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { CHART_PALETTE, chartAxisTickStyle, chartCursorFill, chartGridStroke } from "./chart-theme";
import { ChartTooltipContent } from "./ChartTooltipContent";

export interface TrendBarChartSeries {
  /** Chave do campo numérico em cada item de `data`. */
  key: string;
  /** Rótulo mostrado na legenda/tooltip. */
  label: string;
  /** Cor da barra — se omitida, usa a paleta padrão na ordem em que a série aparece. */
  color?: string;
}

export interface TrendBarChartProps {
  /** Um item por categoria do eixo X — cada item também carrega um campo numérico por série. */
  data: Record<string, string | number>[];
  /** Campo de `data` usado como rótulo do eixo X. */
  categoryKey: string;
  series: TrendBarChartSeries[];
  height?: number;
  valueFormatter?: (value: number) => string;
}

/**
 * Comparativo de barras "período atual vs. período anterior" — a
 * mesma forma de dado que `GET /analytics/national/kpis` já devolve
 * (`periodo`/`periodoAnterior`) e que a Home do Admin já desenhava à
 * mão com `<div>`s de altura calculada. Reaproveitado nas duas telas
 * (Home e Inteligência) por ser exatamente a mesma forma de
 * comparação em ambas.
 */
export function TrendBarChart({
  data,
  categoryKey,
  series,
  height = 260,
  valueFormatter,
}: TrendBarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={chartGridStroke} vertical={false} />
        <XAxis
          dataKey={categoryKey}
          tick={chartAxisTickStyle}
          axisLine={{ stroke: chartGridStroke }}
          tickLine={false}
        />
        <YAxis tick={chartAxisTickStyle} axisLine={false} tickLine={false} width={40} />
        <Tooltip
          content={<ChartTooltipContent valueFormatter={valueFormatter} />}
          cursor={{ fill: chartCursorFill }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {series.map((item, index) => (
          <Bar
            key={item.key}
            dataKey={item.key}
            name={item.label}
            fill={item.color ?? CHART_PALETTE[index % CHART_PALETTE.length]}
            radius={[4, 4, 0, 0]}
            maxBarSize={40}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

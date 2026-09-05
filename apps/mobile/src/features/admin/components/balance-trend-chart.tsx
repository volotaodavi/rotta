import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Line, Path } from "react-native-svg";

import type { LayoutChangeEvent } from "react-native";

import { useTheme } from "@/providers/theme-provider";

export interface TrendPoint {
  value: number;
  label: string;
}

const HEIGHT = 120;
const PADDING = 12;

/**
 * Linha de tendência do saldo ao longo do extrato (pedido do usuário
 * 05/09/2026: "inclua gráficos... com as informações necessárias") —
 * dado REAL, nunca fabricado: cada ponto é o `saldoAposCentavos` de um
 * lançamento de verdade do extrato Asaas (`BillingAdminStatementItem`),
 * nunca uma série histórica inventada (o backend não guarda isso em
 * lugar nenhum — mesma disciplina de `AdminDigestService`).
 *
 * Sem crosshair/tooltip interativo (mobile, toque — não hover); a lista
 * de lançamentos logo abaixo já mostra o valor exato de cada ponto.
 * Extremidade mais recente enfatizada com um círculo, linha de base
 * recessiva (`theme.colors.border`), área de baixo sutil (mesma cor da
 * linha, 10% de opacidade).
 */
export function BalanceTrendChart({ points }: { points: TrendPoint[] }): JSX.Element | null {
  const { theme } = useTheme();
  const [width, setWidth] = useState(0);

  function handleLayout(event: LayoutChangeEvent): void {
    setWidth(event.nativeEvent.layout.width);
  }

  if (points.length < 2) {
    return null;
  }

  if (width === 0) {
    return <View style={{ height: HEIGHT }} onLayout={handleLayout} />;
  }

  const values = points.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const stepX = (width - PADDING * 2) / (points.length - 1);
  const baselineY = HEIGHT - PADDING;

  function scaleY(value: number): number {
    return baselineY - ((value - min) / span) * (HEIGHT - PADDING * 2);
  }

  const coords = points.map((point, index) => ({
    x: PADDING + index * stepX,
    y: scaleY(point.value),
  }));
  const linePath = coords.map((c, i) => `${i === 0 ? "M" : "L"} ${c.x} ${c.y}`).join(" ");
  const last = coords[coords.length - 1]!;
  const first = coords[0]!;
  const areaPath = `${linePath} L ${last.x} ${baselineY} L ${first.x} ${baselineY} Z`;

  return (
    <View onLayout={handleLayout}>
      <Svg width={width} height={HEIGHT}>
        <Line
          x1={PADDING}
          y1={baselineY}
          x2={width - PADDING}
          y2={baselineY}
          stroke={theme.colors.border}
          strokeWidth={1}
        />
        <Path d={areaPath} fill={`${theme.colors.primary}1A`} />
        <Path
          d={linePath}
          stroke={theme.colors.primary}
          strokeWidth={2}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Circle cx={last.x} cy={last.y} r={4} fill={theme.colors.primary} />
      </Svg>
      <View style={styles.legenda}>
        <Text style={{ color: theme.colors.textMuted, fontSize: 11 }}>{points[0]!.label}</Text>
        <Text style={{ color: theme.colors.textMuted, fontSize: 11 }}>
          {points[points.length - 1]!.label}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  legenda: { flexDirection: "row", justifyContent: "space-between", marginTop: 4 },
});

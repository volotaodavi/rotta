import { StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/providers/theme-provider";

export interface BarBreakdownItem {
  label: string;
  value: number;
  color: string;
}

const BAR_HEIGHT = 14;

/**
 * Barra horizontal simples (poucas categorias fixas, ex. Recebido/Taxa
 * retida/Líquido ou empresas ativas por plano) — sem `react-native-svg`,
 * só `View`s com `borderRadius` (ponta arredondada = metade da altura,
 * mesmo princípio de "marca fina, ponta arredondada" do resto do
 * produto). Cor por categoria fixa (nunca reciclada por filtro) — quem
 * chama decide a cor de cada `item`, esta tela só desenha.
 */
export function BarBreakdownChart({
  items,
  formatValue,
}: {
  items: BarBreakdownItem[];
  formatValue: (value: number) => string;
}): JSX.Element {
  const { theme } = useTheme();
  const max = Math.max(...items.map((item) => Math.abs(item.value)), 1);

  return (
    <View style={styles.container}>
      {items.map((item) => {
        const widthPct = Math.max((Math.abs(item.value) / max) * 100, 2);
        return (
          <View key={item.label} style={styles.linhaWrap}>
            <View style={styles.legendaLinha}>
              <Text style={[styles.label, { color: theme.colors.text }]}>{item.label}</Text>
              <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>
                {formatValue(item.value)}
              </Text>
            </View>
            <View
              style={[
                styles.track,
                { backgroundColor: theme.colors.border, borderRadius: BAR_HEIGHT / 2 },
              ]}
            >
              <View
                style={[
                  styles.fill,
                  {
                    width: `${widthPct}%`,
                    backgroundColor: item.color,
                    borderRadius: BAR_HEIGHT / 2,
                  },
                ]}
              />
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12 },
  fill: { height: BAR_HEIGHT },
  label: { fontSize: 12, fontWeight: "600" },
  legendaLinha: { flexDirection: "row", justifyContent: "space-between" },
  linhaWrap: { gap: 4 },
  track: { height: BAR_HEIGHT, overflow: "hidden", width: "100%" },
});

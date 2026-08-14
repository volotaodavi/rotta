import { ArrowLeft, LocateFixed } from "@rotta/icons/native";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";


import type { ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";

import { useTheme } from "@/providers/theme-provider";

/**
 * "Casca" visual compartilhada das telas de mapa em tela cheia do app
 * nativo (Frente Q — pedido do usuário, imagem de referência de um app
 * de navegação: cartão "Your location"/"Select destinations" + chips
 * de distância/tempo + botão de centralizar no GPS). Porta nativa de
 * `apps/web/src/components/route-screen-chrome.tsx` — mesma decisão de
 * não fabricar um seletor de modal (carro/ônibus/bike/a pé): a Rotta só
 * tem um modo de transporte real.
 */

function RouteChip({ label, value }: { label: string; value: string }): JSX.Element {
  const { theme } = useTheme();
  return (
    <View
      style={[
        styles.chip,
        { backgroundColor: theme.colors.surfaceElevated, borderRadius: theme.radius.lg },
        theme.elevation.dropdown.native,
      ]}
    >
      <Text style={{ color: theme.colors.textMuted, fontSize: 11 }}>{label}</Text>
      <Text style={{ color: theme.colors.text, fontSize: 13, fontWeight: "700" }}>{value}</Text>
    </View>
  );
}

/**
 * Cartão "De/Para" — mesma leitura visual da web: bolinha (origem) e
 * pino (destino) ligados por uma linha vertical pontilhada.
 * `onVoltar` é opcional (nem toda tela em tela cheia tem pra onde
 * voltar por cima do mapa).
 */
export function RouteFromToCard({
  onVoltar,
  origemLabel,
  destinoLabel,
  chips,
  rightSlot,
}: {
  onVoltar?: () => void;
  origemLabel: string;
  destinoLabel: string;
  chips?: { label: string; value: string }[];
  /** Conteúdo extra à direita do cartão (ex.: `StatusPill` da viagem). */
  rightSlot?: ReactNode;
}): JSX.Element {
  const { theme } = useTheme();

  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <View
        style={[
          styles.card,
          styles.cardRow,
          { backgroundColor: theme.colors.surfaceElevated, borderRadius: theme.radius.lg },
          theme.elevation.dropdown.native,
        ]}
      >
        {onVoltar ? (
          <TouchableOpacity
            onPress={onVoltar}
            accessibilityLabel="Voltar"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.voltarButton}
          >
            <ArrowLeft size={18} color={theme.colors.textMuted} />
          </TouchableOpacity>
        ) : null}
        <View style={{ flex: 1, gap: 10 }}>
          <View style={styles.pontoRow}>
            <View style={[styles.dotOrigem, { borderColor: theme.colors.primary }]} />
            <Text
              style={{ color: theme.colors.text, fontSize: 13, fontWeight: "600", flex: 1 }}
              numberOfLines={1}
            >
              {origemLabel}
            </Text>
          </View>
          <View style={[styles.linhaConectora, { borderColor: theme.colors.border }]} />
          <View style={styles.pontoRow}>
            <View style={[styles.dotDestino, { backgroundColor: theme.colors.danger }]} />
            <Text
              style={{ color: theme.colors.text, fontSize: 13, fontWeight: "600", flex: 1 }}
              numberOfLines={1}
            >
              {destinoLabel}
            </Text>
          </View>
        </View>
        {rightSlot}
      </View>

      {chips && chips.length > 0 ? (
        <View style={styles.chipsRow}>
          {chips.map((chip) => (
            <RouteChip key={chip.label} label={chip.label} value={chip.value} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

/**
 * Botão flutuante "centralizar no meu GPS" (banner de referência:
 * círculo com mira). Só decorativo se ninguém plugar `onPress` a um
 * remonte real do mapa — as duas telas que usam isto (Frente Q) passam
 * um `key` de mapa que muda a cada clique, mesma solução da web
 * (`RottaMap`/`RottaMapNative` só leem `initialCenter` na montagem).
 */
export function RecenterButton({
  onPress,
  isLoading,
  style,
}: {
  onPress: () => void;
  isLoading?: boolean;
  style?: StyleProp<ViewStyle>;
}): JSX.Element {
  const { theme } = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isLoading}
      accessibilityLabel="Centralizar no meu GPS"
      style={[
        styles.recenterButton,
        {
          backgroundColor: theme.colors.surfaceElevated,
          borderRadius: theme.radius.lg,
          opacity: isLoading ? 0.6 : 1,
        },
        theme.elevation.dropdown.native,
        style,
      ]}
    >
      {isLoading ? (
        <ActivityIndicator color={theme.colors.primary} size="small" />
      ) : (
        <LocateFixed size={20} color={theme.colors.text} />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16 },
  cardRow: { alignItems: "flex-start", flexDirection: "row", gap: 12 },
  chip: { gap: 2, paddingHorizontal: 12, paddingVertical: 8 },
  chipsRow: { flexDirection: "row", gap: 8, marginTop: 10 },
  dotDestino: { borderRadius: 5, height: 10, width: 10 },
  dotOrigem: { borderRadius: 4, borderWidth: 2, height: 8, width: 8 },
  linhaConectora: { borderLeftWidth: 1, borderStyle: "dashed", height: 12, marginLeft: 3.5 },
  pontoRow: { alignItems: "center", flexDirection: "row", gap: 10 },
  recenterButton: { alignItems: "center", height: 44, justifyContent: "center", width: 44 },
  voltarButton: { alignItems: "center", height: 24, justifyContent: "center", width: 24 },
  // Sem `position: "absolute"` aqui de propósito — cada tela chamadora
  // decide como posicionar isto por cima do mapa (mesmo padrão do
  // antigo `topOverlay` de `transporte-inicio-screen.tsx`), pra não
  // travar num offset fixo que não serve pra toda tela.
  wrap: {},
});

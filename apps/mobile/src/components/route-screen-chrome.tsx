import { ArrowLeft, LocateFixed } from "@rotta/icons/native";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Svg, { Defs, LinearGradient, Path, Stop } from "react-native-svg";


import type { ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";

import { useTheme } from "@/providers/theme-provider";

/**
 * "Casca" visual compartilhada das telas de mapa em tela cheia do app
 * nativo (Frente Q — pedido do usuário, imagem de referência de um app
 * de navegação: cartão "Your location"/"Select destinations" + chips
 * de distância/tempo + botão de centralizar no GPS; repaginada na
 * Frente R com uma 2ª referência — app de rastreamento com cartões em
 * gradiente azul e um padrão de onda decorativo). Porta nativa de
 * `apps/web/src/components/route-screen-chrome.tsx` — mesma decisão de
 * não fabricar um seletor de modal nem zonas coloridas de caso/status
 * (carro/ônibus/bike/a pé; "Confirmed/Monitoring/Medical Services"): a
 * Rotta só tem um modo de transporte real e nenhuma categoria de caso
 * pra desenhar no mapa — o que os dois banners têm em comum e SE
 * aplica de verdade (cartão em gradiente, textura de onda, chips em
 * vidro fosco) virou o cartão abaixo, com dado real de rota.
 *
 * Gradiente via `react-native-svg` (já dependência do app, mesmo motor
 * dos ícones de veículo em `@rotta/maps`) — nunca `expo-linear-
 * gradient`, que exigiria adicionar uma dependência nativa nova só pra
 * isso.
 */

/** Textura de onda decorativa (mesmo SVG desenhado à mão da web) — puramente ornamental. */
function CardWaveDecoration(): JSX.Element {
  return (
    <Svg
      viewBox="0 0 400 140"
      preserveAspectRatio="none"
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
    >
      <Path
        d="M0 55 C 70 15, 140 90, 210 50 S 340 5, 400 45 L400 0 L0 0 Z"
        fill="white"
        fillOpacity={0.12}
      />
      <Path
        d="M0 90 C 90 60, 160 130, 260 85 S 360 55, 400 90 L400 140 L0 140 Z"
        fill="white"
        fillOpacity={0.12}
      />
    </Svg>
  );
}

/** Fundo em gradiente azul do cartão De/Para — mesmas cores de `theme.colors.primary`, nunca uma cor nova. */
function CardGradientBackground({ from, to }: { from: string; to: string }): JSX.Element {
  return (
    <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <LinearGradient id="routeCardGradient" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={from} />
          <Stop offset="1" stopColor={to} />
        </LinearGradient>
      </Defs>
      <Path d="M0 0 H1000 V1000 H0 Z" fill="url(#routeCardGradient)" />
    </Svg>
  );
}

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
 * pino (destino) ligados por uma linha vertical pontilhada, agora
 * sobre um fundo em gradiente azul (`CardGradientBackground`) com a
 * textura de onda por cima (`CardWaveDecoration`) — único cartão
 * cromático saturado da tela, o resto do mapa continua neutro.
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
          { borderRadius: theme.radius.xl, overflow: "hidden" },
          theme.elevation.dropdown.native,
        ]}
      >
        <CardGradientBackground from={theme.colors.primary} to={theme.colors.primaryHover} />
        <CardWaveDecoration />
        {onVoltar ? (
          <TouchableOpacity
            onPress={onVoltar}
            accessibilityLabel="Voltar"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.voltarButton}
          >
            <ArrowLeft size={18} color="rgba(255,255,255,0.85)" />
          </TouchableOpacity>
        ) : null}
        <View style={{ flex: 1, gap: 10 }}>
          <View style={styles.pontoRow}>
            <View style={styles.dotOrigem} />
            <Text
              style={{ color: "#ffffff", fontSize: 13, fontWeight: "600", flex: 1 }}
              numberOfLines={1}
            >
              {origemLabel}
            </Text>
          </View>
          <View style={[styles.linhaConectora, { borderColor: "rgba(255,255,255,0.4)" }]} />
          <View style={styles.pontoRow}>
            <View style={styles.dotDestino} />
            <Text
              style={{ color: "#ffffff", fontSize: 13, fontWeight: "600", flex: 1 }}
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
  // Brancas sobre o gradiente azul do cartão (ver `CardGradientBackground`) — não dependem de tema claro/escuro, já que o cartão é sempre azul.
  dotDestino: { backgroundColor: "#ffffff", borderRadius: 5, height: 10, width: 10 },
  dotOrigem: {
    backgroundColor: "transparent",
    borderColor: "#ffffff",
    borderRadius: 4,
    borderWidth: 2,
    height: 8,
    width: 8,
  },
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

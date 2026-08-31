import { ChevronsRight } from "@rotta/icons/native";
import { useRef, useState } from "react";
import { ActivityIndicator, Animated, PanResponder, StyleSheet, Text, View } from "react-native";

import type { Theme } from "@rotta/theme";

/**
 * Botão deslizante ("slide to confirm", padrão Uber/apps de mobilidade
 * — pedido explícito do usuário, "Faça isso para todas as plataformas
 * (TODAS, sem exceção)") — porta nativa de
 * `apps/web/src/components/slide-to-action.tsx` (Frente P3), mesma
 * lógica, trocando Pointer Events do navegador por `PanResponder` +
 * `Animated` (ambos do próprio `react-native`, mesma decisão de
 * arquitetura já registrada em `@rotta/ui/native`'s `BottomSheet`: sem
 * `react-native-gesture-handler`/Reanimated só pra isto).
 *
 * Não dispara `onComplete` durante o arrasto — só ao soltar com o
 * polegar tendo passado de ~82% do percurso (spec do Motorista,
 * 31/08/2026 — evita disparo acidental por um toque de leve) — e
 * sempre volta ao início se soltar antes disso. `direction="left"`
 * inverte o sentido do arrasto, mesma API de `apps/web`.
 */
export interface SlideToActionProps {
  label: string;
  onComplete: () => void;
  theme: Theme;
  /** Texto mostrado no lugar de `label` assim que o arrasto ultrapassa o limiar de confirmação — feedback imediato antes de `isLoading` chegar. */
  completedLabel?: string;
  isLoading?: boolean;
  disabled?: boolean;
  direction?: "left" | "right";
  /** Atalho pra `thumbColor: theme.colors.driverDanger` (ex. finalizar viagem). */
  danger?: boolean;
  /** Cor do polegar — `theme.colors.driverPrimary` (iniciar/retomar) por padrão; ignorada se `danger` for `true`. */
  thumbColor?: string;
}

const THUMB_SIZE = 56;
const COMPLETE_THRESHOLD = 0.82;

export function SlideToAction({
  label,
  onComplete,
  theme,
  completedLabel,
  isLoading = false,
  disabled = false,
  direction = "right",
  danger = false,
  thumbColor,
}: SlideToActionProps): JSX.Element {
  const [trackWidth, setTrackWidth] = useState(0);
  const [progress, setProgress] = useState(0);
  const translateX = useRef(new Animated.Value(0)).current;
  const dragXRef = useRef(0);
  const isInteractive = !disabled && !isLoading;
  const maxDrag = Math.max(trackWidth - THUMB_SIZE, 0);
  const sign = direction === "left" ? -1 : 1;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => isInteractive,
      onMoveShouldSetPanResponder: () => isInteractive,
      onPanResponderMove: (_event, gesture) => {
        const next = Math.min(Math.max(gesture.dx * sign, 0), maxDrag);
        dragXRef.current = next;
        translateX.setValue(next * sign);
        setProgress(maxDrag > 0 ? next / maxDrag : 0);
      },
      onPanResponderRelease: () => {
        const completed = maxDrag > 0 && dragXRef.current / maxDrag >= COMPLETE_THRESHOLD;
        Animated.spring(translateX, { toValue: 0, useNativeDriver: true, bounciness: 4 }).start();
        dragXRef.current = 0;
        setProgress(0);
        if (completed) onComplete();
      },
      onPanResponderTerminate: () => {
        Animated.spring(translateX, { toValue: 0, useNativeDriver: true, bounciness: 4 }).start();
        dragXRef.current = 0;
        setProgress(0);
      },
    }),
  ).current;

  const showCompletedLabel = !!completedLabel && progress >= COMPLETE_THRESHOLD;
  const thumbBackgroundColor = danger
    ? theme.colors.driverDanger
    : (thumbColor ?? theme.colors.driverPrimary);

  return (
    <View
      onLayout={(event) => setTrackWidth(event.nativeEvent.layout.width)}
      style={[
        styles.track,
        {
          backgroundColor: isInteractive
            ? theme.colors.surfaceElevated
            : theme.colors.disabled.background,
          borderColor: theme.colors.border,
        },
      ]}
    >
      <View style={styles.labelWrap} pointerEvents="none">
        <Text
          style={{
            color: isInteractive ? theme.colors.textMuted : theme.colors.disabled.text,
            fontSize: 14,
            fontWeight: "600",
          }}
        >
          {showCompletedLabel ? completedLabel : label}
        </Text>
      </View>
      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.thumb,
          direction === "left" ? styles.thumbRight : styles.thumbLeft,
          {
            backgroundColor: thumbBackgroundColor,
            opacity: isInteractive ? 1 : 0.6,
            transform: [{ translateX }],
          },
        ]}
      >
        {isLoading ? (
          <ActivityIndicator color="#FFFFFF" size="small" />
        ) : (
          <ChevronsRight
            size={22}
            color="#FFFFFF"
            style={direction === "left" ? styles.chevronFlipped : undefined}
          />
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  chevronFlipped: {
    transform: [{ rotate: "180deg" }],
  },
  labelWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: THUMB_SIZE + 8,
  },
  thumb: {
    alignItems: "center",
    borderRadius: THUMB_SIZE / 2,
    height: THUMB_SIZE,
    justifyContent: "center",
    position: "absolute",
    top: 0,
    width: THUMB_SIZE,
  },
  thumbLeft: {
    left: 0,
  },
  thumbRight: {
    right: 0,
  },
  track: {
    borderRadius: 9999,
    borderWidth: 1,
    height: 56,
    justifyContent: "center",
    overflow: "hidden",
    width: "100%",
  },
});

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
 * polegar tendo passado de ~80% do percurso (evita disparo acidental
 * por um toque de leve) — e sempre volta ao início se soltar antes
 * disso.
 */
export interface SlideToActionProps {
  label: string;
  onComplete: () => void;
  theme: Theme;
  isLoading?: boolean;
  disabled?: boolean;
  /** Cor do polegar — `theme.colors.primary` (iniciar/retomar) ou `theme.colors.danger` (finalizar), por exemplo. */
  thumbColor?: string;
}

const THUMB_SIZE = 56;
const COMPLETE_THRESHOLD = 0.8;

export function SlideToAction({
  label,
  onComplete,
  theme,
  isLoading = false,
  disabled = false,
  thumbColor,
}: SlideToActionProps): JSX.Element {
  const [trackWidth, setTrackWidth] = useState(0);
  const translateX = useRef(new Animated.Value(0)).current;
  const dragXRef = useRef(0);
  const isInteractive = !disabled && !isLoading;
  const maxDrag = Math.max(trackWidth - THUMB_SIZE, 0);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => isInteractive,
      onMoveShouldSetPanResponder: () => isInteractive,
      onPanResponderMove: (_event, gesture) => {
        const next = Math.min(Math.max(gesture.dx, 0), maxDrag);
        dragXRef.current = next;
        translateX.setValue(next);
      },
      onPanResponderRelease: () => {
        const completed = maxDrag > 0 && dragXRef.current / maxDrag >= COMPLETE_THRESHOLD;
        Animated.spring(translateX, { toValue: 0, useNativeDriver: true, bounciness: 4 }).start();
        dragXRef.current = 0;
        if (completed) onComplete();
      },
      onPanResponderTerminate: () => {
        Animated.spring(translateX, { toValue: 0, useNativeDriver: true, bounciness: 4 }).start();
        dragXRef.current = 0;
      },
    }),
  ).current;

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
          {label}
        </Text>
      </View>
      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.thumb,
          {
            backgroundColor: thumbColor ?? theme.colors.primary,
            opacity: isInteractive ? 1 : 0.6,
            transform: [{ translateX }],
          },
        ]}
      >
        {isLoading ? (
          <ActivityIndicator color="#FFFFFF" size="small" />
        ) : (
          <ChevronsRight size={22} color="#FFFFFF" />
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
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
    left: 0,
    position: "absolute",
    top: 0,
    width: THUMB_SIZE,
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

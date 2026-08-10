import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Animated,
  Dimensions,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import type { Theme } from "@rotta/theme";

/**
 * BottomSheet — segundo componente real de `@rotta/ui/native` (junto
 * com `Timeline`, ver nota lá). Pedido explícito do prompt "UX/UI
 * Master do Marketplace": a lista de transportadores de uma escola
 * "não será uma lista infinita… será uma lista inteligente" apresentada
 * num Bottom Sheet que "acompanha o dedo".
 *
 * Decisão de arquitetura: `Animated` + `PanResponder` (ambos do próprio
 * `react-native`), NÃO `react-native-reanimated` +
 * `react-native-gesture-handler` + `@gorhom/bottom-sheet`. O projeto já
 * aceita dependência nativa que exige rebuild do dev client quando o
 * ganho é real (`@maplibre/maplibre-react-native`, `react-native-svg` —
 * Dossiê 36 §7), mas um pacote de gestos completo é um compromisso de
 * arquitetura maior (plugin de Babel, nova cadeia de gestos em todo o
 * app) que merece decisão própria, não algo assumido de lado dentro
 * desta entrega. Esta v1 cobre o caso real (abrir/arrastar para
 * fechar, sem múltiplos snap-points) — evoluir para Reanimated/Gorhom
 * fica registrado como próximo passo caso o produto peça snap-points
 * intermediários de verdade.
 */
export interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  theme: Theme;
  /** Título opcional no cabeçalho fixo (acima da área que rola). */
  title?: string;
  /** Altura do painel em pontos — padrão: 70% da altura da janela. */
  height?: number;
}

const DRAG_CLOSE_THRESHOLD = 120;
const DRAG_VELOCITY_THRESHOLD = 0.8;

export function BottomSheet({
  isOpen,
  onClose,
  children,
  theme,
  title,
  height,
}: BottomSheetProps): JSX.Element | null {
  const windowHeight = Dimensions.get("window").height;
  const sheetHeight = height ?? windowHeight * 0.7;

  const translateY = useRef(new Animated.Value(sheetHeight)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const dragOffset = useRef(0);
  const [rendered, setRendered] = useState(isOpen);

  useEffect(() => {
    if (isOpen) {
      setRendered(true);
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          bounciness: 4,
        }),
        Animated.timing(backdropOpacity, {
          toValue: theme.opacity.scrim,
          duration: theme.motion.duration.moderate,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: sheetHeight,
          duration: theme.motion.duration.moderate,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: theme.motion.duration.moderate,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) setRendered(false);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, sheetHeight]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_event, gesture) => Math.abs(gesture.dy) > 4,
      onPanResponderGrant: () => {
        dragOffset.current = 0;
      },
      onPanResponderMove: (_event, gesture) => {
        const next = Math.max(0, gesture.dy);
        dragOffset.current = next;
        translateY.setValue(next);
      },
      onPanResponderRelease: (_event, gesture) => {
        if (gesture.dy > DRAG_CLOSE_THRESHOLD || gesture.vy > DRAG_VELOCITY_THRESHOLD) {
          onClose();
          return;
        }
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, bounciness: 4 }).start();
      },
    }),
  ).current;

  if (!rendered) return null;

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
      <Animated.View
        style={[styles.backdrop, { opacity: backdropOpacity, backgroundColor: "#000000" }]}
      >
        <Pressable
          style={StyleSheet.absoluteFillObject}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Fechar"
        />
      </Animated.View>
      <Animated.View
        style={[
          styles.sheet,
          {
            height: sheetHeight,
            backgroundColor: theme.colors.surfaceElevated,
            borderTopLeftRadius: theme.radius.xl,
            borderTopRightRadius: theme.radius.xl,
            transform: [{ translateY }],
            ...theme.elevation.modal.native,
          },
        ]}
      >
        <View {...panResponder.panHandlers} style={styles.header}>
          <View style={[styles.handle, { backgroundColor: theme.colors.border }]} />
          {title ? <Text style={[styles.title, { color: theme.colors.text }]}>{title}</Text> : null}
        </View>
        <View style={styles.content}>{children}</View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject },
  content: { flex: 1 },
  handle: { alignSelf: "center", borderRadius: 3, height: 4, marginBottom: 8, width: 36 },
  header: { paddingHorizontal: 16, paddingTop: 10 },
  sheet: { bottom: 0, left: 0, position: "absolute", right: 0 },
  title: { fontSize: 16, fontWeight: "700", paddingBottom: 8 },
});

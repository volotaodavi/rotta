import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, StyleSheet, View } from "react-native";

import { RottaLogo } from "./rotta-logo";

import { useTheme } from "@/providers/theme-provider";

/**
 * Splash em React puro (Seção 1/16) — mostrada enquanto o `RootNavigator`
 * resolve a sessão (`useAuth().status === "loading"`) e o flag de
 * onboarding já visto (`getHasSeenOnboarding`). Complementa, não
 * substitui, a splash NATIVA do Expo já configurada em `app.config.ts`
 * (`splash.image`/`splash.backgroundColor`, mostrada pelo sistema
 * operacional antes do bundle JS carregar) — aquela cobre o instante
 * "app ainda não iniciou"; esta cobre "app já iniciou, mas ainda
 * decidindo pra onde navegar", que a splash nativa não sabe fazer.
 *
 * Fundo azul da marca (`theme.colors.primary`) + símbolo "R" centralizado
 * (Seção 1: "fundo azul Rotta, símbolo R centralizado, nome ROTTA
 * abaixo"), com um fade + scale muito sutil (nunca giro/3D/partículas) —
 * respeita `prefers-reduced-motion` (`AccessibilityInfo.isReduceMotionEnabled`,
 * equivalente nativo) pulando direto pro estado final quando ativado.
 */
export function AppSplashScreen(): JSX.Element {
  const { theme } = useTheme();
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.96)).current;
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (mounted) setReduceMotion(enabled);
      })
      .catch(() => undefined);
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      opacity.setValue(1);
      scale.setValue(1);
      return;
    }
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 380, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: 380, useNativeDriver: true }),
    ]).start();
  }, [opacity, scale, reduceMotion]);

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.primary }]}
      accessibilityRole="none"
      accessibilityLabel="Carregando a Rotta"
    >
      <Animated.View style={{ opacity, transform: [{ scale }] }}>
        <RottaLogo size={88} variant="full" textColor="#FFFFFF" />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: "center", flex: 1, justifyContent: "center" },
});

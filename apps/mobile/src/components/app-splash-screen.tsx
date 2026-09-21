import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Pressable, StyleSheet, Text, View } from "react-native";

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
export interface AppSplashScreenProps {
  /**
   * A espera passou do limite razoável. Mostra uma saída em vez de
   * deixar a pessoa olhando para um logo parado.
   */
  travado?: boolean;
  /** Limpa a sessão guardada e leva para o login. */
  onSair?: () => void;
}

export function AppSplashScreen({ travado, onSair }: AppSplashScreenProps = {}): JSX.Element {
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

      {/* Incidente de 21/09/2026: transportadores ficaram presos nesta
          tela sem nenhuma saída — sem erro, sem botão, e voltando igual
          a cada vez que abriam o app. As causas foram consertadas na
          origem, mas uma tela de carregamento nunca mais pode ser um
          beco sem saída: se a espera passar do limite, existe um jeito
          de sair daqui sem desinstalar o aplicativo. */}
      {travado ? (
        <View style={styles.saida}>
          <Text style={styles.aviso}>Está demorando mais que o normal para abrir sua conta.</Text>
          {onSair ? (
            <Pressable
              onPress={onSair}
              accessibilityRole="button"
              style={({ pressed }) => [styles.botao, pressed && styles.botaoPressionado]}
            >
              <Text style={styles.botaoTexto}>Entrar de novo</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  aviso: {
    color: "#FFFFFF",
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.9,
    textAlign: "center",
  },
  botao: {
    backgroundColor: "#FFFFFF",
    borderRadius: 999,
    paddingHorizontal: 28,
    paddingVertical: 14,
  },
  botaoPressionado: { opacity: 0.85 },
  botaoTexto: { color: "#0B3C8D", fontSize: 15, fontWeight: "700" },
  container: { alignItems: "center", flex: 1, justifyContent: "center" },
  saida: {
    alignItems: "center",
    gap: 16,
    marginTop: 40,
    maxWidth: 300,
    paddingHorizontal: 24,
  },
});

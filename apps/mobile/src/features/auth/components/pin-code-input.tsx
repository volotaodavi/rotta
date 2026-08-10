import { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, TextInput, View } from "react-native";

import { useTheme } from "@/providers/theme-provider";

const PIN_LENGTH = 4;

/**
 * Caixinhas de PIN animadas (Dossiê 42) — referência trazida pelo usuário
 * foi um showcase de componente de terceiro de verificação por SMS
 * (caixinhas que preenchem enquanto a pessoa digita, com sugestão de
 * autopreenchimento da mensagem). Usado aqui só o CONCEITO — caixinhas
 * que reagem a cada dígito — nunca as cores/textos/ícones daquele
 * componente. Também não é o mesmo caso de uso: aqui não existe SMS para
 * autopreencher (é um PIN local, nunca enviado por mensagem), então não
 * há botão "Fill" nem qualquer sugestão de preenchimento automático.
 *
 * Um `TextInput` real fica invisível por cima das caixinhas (mesmo
 * truque de qualquer campo de código nativo) só para abrir o teclado
 * numérico do sistema — as caixinhas são puramente visuais e nunca lêem
 * texto sozinhas, só espelham `value`.
 */
export function PinCodeInput({
  value,
  onChangeValue,
  onComplete,
  shakeSignal,
  autoFocus = true,
}: {
  value: string;
  onChangeValue: (next: string) => void;
  /** Disparado quando o 4º dígito é digitado (não espera nenhum submit). */
  onComplete?: (pin: string) => void;
  /** Incrementar este número de fora dispara a animação de "PIN errado". */
  shakeSignal: number;
  autoFocus?: boolean;
}): JSX.Element {
  const { theme } = useTheme();
  const inputRef = useRef<TextInput>(null);
  const shakeX = useRef(new Animated.Value(0)).current;
  const scales = useRef(Array.from({ length: PIN_LENGTH }, () => new Animated.Value(1))).current;
  const previousLength = useRef(0);
  const previousShakeSignal = useRef(shakeSignal);

  useEffect(() => {
    if (value.length > previousLength.current) {
      const index = value.length - 1;
      const scale = scales[index];
      if (scale) {
        scale.setValue(1.3);
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 5 }).start();
      }
      if (value.length === PIN_LENGTH) {
        onComplete?.(value);
      }
    }
    previousLength.current = value.length;
    // `scales`/`onComplete` são estáveis (ref e prop de callback) — só o
    // comprimento do PIN deve redisparar esta animação de "pulso".
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  useEffect(() => {
    if (shakeSignal === previousShakeSignal.current) {
      return;
    }
    previousShakeSignal.current = shakeSignal;
    Animated.sequence(
      [-10, 10, -8, 8, -4, 4, 0].map((toValue) =>
        Animated.timing(shakeX, { toValue, duration: 45, useNativeDriver: true }),
      ),
    ).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shakeSignal]);

  return (
    <Pressable onPress={() => inputRef.current?.focus()} accessibilityRole="none">
      <Animated.View style={[styles.row, { transform: [{ translateX: shakeX }] }]}>
        {Array.from({ length: PIN_LENGTH }).map((_, index) => {
          const filled = index < value.length;
          return (
            <Animated.View
              key={index}
              style={[
                styles.box,
                {
                  borderColor: filled ? theme.colors.primary : theme.colors.border,
                  backgroundColor: filled ? theme.colors.primaryMuted : "transparent",
                  borderRadius: theme.radius.md,
                  transform: [{ scale: scales[index] ?? 1 }],
                },
              ]}
            >
              {filled ? (
                <View style={[styles.dot, { backgroundColor: theme.colors.primary }]} />
              ) : null}
            </Animated.View>
          );
        })}
      </Animated.View>
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={(text) => onChangeValue(text.replace(/\D/g, "").slice(0, PIN_LENGTH))}
        keyboardType="number-pad"
        maxLength={PIN_LENGTH}
        autoFocus={autoFocus}
        secureTextEntry
        style={styles.hiddenInput}
        accessibilityLabel="PIN de 4 dígitos"
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: {
    alignItems: "center",
    borderWidth: 2,
    height: 56,
    justifyContent: "center",
    width: 56,
  },
  dot: { borderRadius: 999, height: 10, width: 10 },
  hiddenInput: { height: 0, opacity: 0, position: "absolute", width: 0 },
  row: { flexDirection: "row", gap: 12, justifyContent: "center" },
});

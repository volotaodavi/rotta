import { Check } from "@rotta/icons/native";
import { useRef } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";

import type { LucideIcon } from "@rotta/icons/native";

import { useTheme } from "@/providers/theme-provider";

/**
 * Opção de perfil da tela "Como você utiliza a Rotta?" (Seção 3) — ícone
 * + título + descrição curta + indicador de seleção, área de toque
 * inteira clicável (nunca um card gigante ocupando a tela). Selecionada:
 * realce azul da marca na borda/fundo + check surgindo suavemente
 * (Seção 9: "seleção com pequena transição, mudança de border, check
 * aparecendo suavemente").
 */
export function RoleOption({
  icon: Icon,
  title,
  description,
  selected,
  onPress,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  selected: boolean;
  onPress: () => void;
}): JSX.Element {
  const { theme } = useTheme();
  const scale = useRef(new Animated.Value(1)).current;

  function handlePressIn(): void {
    Animated.timing(scale, { toValue: 0.98, duration: 80, useNativeDriver: true }).start();
  }

  function handlePressOut(): void {
    Animated.timing(scale, { toValue: 1, duration: 80, useNativeDriver: true }).start();
  }

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        accessibilityRole="radio"
        accessibilityState={{ selected }}
        accessibilityLabel={`${title}. ${description}`}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          styles.container,
          {
            backgroundColor: theme.colors.surfaceElevated,
            borderColor: selected ? theme.colors.primary : theme.colors.border,
            borderWidth: selected ? 2 : 1,
            borderRadius: theme.radius.lg,
            padding: theme.spacing[4],
            gap: theme.spacing[3],
          },
        ]}
      >
        <View
          style={[
            styles.iconCircle,
            { backgroundColor: selected ? theme.colors.primaryMuted : theme.colors.muted },
          ]}
        >
          <Icon size={22} color={selected ? theme.colors.primary : theme.colors.textMuted} />
        </View>

        <View style={styles.textBlock}>
          <Text
            style={[
              styles.title,
              { color: theme.colors.text, fontSize: theme.typography.body.fontSize },
            ]}
          >
            {title}
          </Text>
          <Text style={[styles.description, { color: theme.colors.textMuted }]}>{description}</Text>
        </View>

        <View
          style={[
            styles.check,
            {
              borderColor: selected ? theme.colors.primary : theme.colors.border,
              backgroundColor: selected ? theme.colors.primary : "transparent",
            },
          ]}
        >
          {selected ? <Check size={14} color="#FFFFFF" /> : null}
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  check: {
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 2,
    height: 24,
    justifyContent: "center",
    width: 24,
  },
  container: { alignItems: "center", flexDirection: "row", minHeight: 44 },
  description: { fontSize: 13, lineHeight: 18, marginTop: 2 },
  iconCircle: {
    alignItems: "center",
    borderRadius: 999,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  textBlock: { flex: 1 },
  title: { fontWeight: "600" },
});

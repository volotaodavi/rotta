import { ChevronRight } from "@rotta/icons/native";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { ComponentType } from "react";

import { useTheme } from "@/providers/theme-provider";

interface RoleOptionCardProps {
  icon: ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  title: string;
  description: string;
  onPress: () => void;
}

/**
 * Cartão de opção (ícone + título + descrição) — substitui a lista de
 * `AuthButton` empilhados nas telas de escolha do fluxo de Auth (Criar
 * Conta, Área Profissional, Área Pessoal), seguindo o print de
 * referência real da Rotta anexado pelo usuário 15/09/2026 ("Cadastro —
 * Seleção de Perfil"). Todo cartão tem o mesmo peso visual (nenhum
 * "primary" vs "secondary") — são navegações pra outra tela, não
 * variações de importância de uma ação.
 */
export function RoleOptionCard({
  icon: Icon,
  title,
  description,
  onPress,
}: RoleOptionCardProps): JSX.Element {
  const { theme } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: theme.colors.surfaceElevated,
          borderColor: theme.colors.border,
          borderRadius: theme.radius.lg,
          padding: theme.spacing[4],
          gap: theme.spacing[3],
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <View
        style={[
          styles.iconWrap,
          { backgroundColor: theme.colors.primaryMuted, borderRadius: theme.radius.md },
        ]}
      >
        <Icon size={20} color={theme.colors.primary} />
      </View>
      <View style={styles.textBlock}>
        <Text style={[styles.title, { color: theme.colors.text }]}>{title}</Text>
        <Text style={[styles.description, { color: theme.colors.textMuted }]}>{description}</Text>
      </View>
      <ChevronRight size={20} color={theme.colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { alignItems: "center", borderWidth: 1, flexDirection: "row" },
  description: { fontSize: 14, lineHeight: 18 },
  iconWrap: { alignItems: "center", height: 44, justifyContent: "center", width: 44 },
  textBlock: { flex: 1, gap: 2 },
  title: { fontSize: 16, fontWeight: "700" },
});

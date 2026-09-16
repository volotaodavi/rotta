import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";

import { useTheme } from "@/providers/theme-provider";

type AuthButtonVariant = "primary" | "secondary" | "ghost";

interface AuthButtonProps {
  label: string;
  onPress: () => void;
  variant?: AuthButtonVariant;
  isLoading?: boolean;
  disabled?: boolean;
}

/**
 * Botão base do fluxo de entrada/autenticação (Dossiê 15) — não é um
 * componente de `@rotta/ui/native` (nenhum Design System nativo existe
 * ainda, decisão de escopo do módulo Auth); vive local a esta feature.
 */
export function AuthButton({
  label,
  onPress,
  variant = "primary",
  isLoading = false,
  disabled = false,
}: AuthButtonProps): JSX.Element {
  const { theme } = useTheme();
  const isDisabled = disabled || isLoading;

  const backgroundColor =
    variant === "primary"
      ? theme.colors.primary
      : variant === "secondary"
        ? theme.colors.surfaceElevated
        : "transparent";
  const textColor = variant === "primary" ? theme.colors.onPrimary : theme.colors.text;
  const borderColor = variant === "ghost" ? "transparent" : theme.colors.border;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor,
          borderColor,
          borderWidth: variant === "secondary" ? 1 : 0,
          opacity: isDisabled ? 0.6 : pressed ? 0.85 : 1,
          paddingVertical: theme.spacing[3] + 2,
          paddingHorizontal: theme.spacing[6],
          // `radius.lg` (Dossiê 15 — redesign 15/09/2026, print de
          // referência real da Rotta anexado pelo usuário: botão
          // levemente arredondado, não em pílula — troca o print
          // genérico de app de transporte usado antes). Escopo isolado
          // ao fluxo de Auth — `AuthButton` não é `@rotta/ui/native`,
          // nunca afeta botões de outra área do app.
          borderRadius: theme.radius.lg,
        },
      ]}
    >
      {isLoading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <Text
          style={[styles.label, { color: textColor, fontSize: theme.typography.button.fontSize }]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: "center", justifyContent: "center" },
  label: { fontWeight: "600" },
});

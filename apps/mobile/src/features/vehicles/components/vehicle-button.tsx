import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";

import { useTheme } from "@/providers/theme-provider";

type VehicleButtonVariant = "primary" | "secondary" | "ghost";

interface VehicleButtonProps {
  label: string;
  onPress: () => void;
  variant?: VehicleButtonVariant;
  isLoading?: boolean;
  disabled?: boolean;
}

/** Botão base das telas de Veículos — ver nota de escopo em `vehicle-screen.tsx`. */
export function VehicleButton({
  label,
  onPress,
  variant = "primary",
  isLoading = false,
  disabled = false,
}: VehicleButtonProps): JSX.Element {
  const { theme } = useTheme();
  const isDisabled = disabled || isLoading;

  const backgroundColor =
    variant === "primary"
      ? theme.colors.primary
      : variant === "secondary"
        ? theme.colors.surfaceElevated
        : "transparent";
  const textColor = variant === "primary" ? "#FFFFFF" : theme.colors.text;
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
          paddingVertical: theme.spacing[3],
          paddingHorizontal: theme.spacing[6],
          borderRadius: theme.radius.md,
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

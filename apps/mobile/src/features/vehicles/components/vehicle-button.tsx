import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";

import type { ReactNode } from "react";

import { Texto } from "@/components/texto";
import { useTheme } from "@/providers/theme-provider";

type VehicleButtonVariant = "primary" | "secondary" | "ghost" | "danger";

interface VehicleButtonProps {
  label: string;
  onPress: () => void;
  variant?: VehicleButtonVariant;
  isLoading?: boolean;
  disabled?: boolean;
  /** Ícone opcional antes do texto (Dossiê 36 — nunca emoji, sempre `@rotta/icons/native`). */
  icon?: ReactNode;
  /**
   * `pilula` arredonda o botão por inteiro.
   *
   * No conceito aprovado em 16/10/2026 isso aparece numa situação só, e
   * não por acaso: o botão que leva ao mapa ao vivo, no Início do
   * Responsável. É a ação de maior peso do app para quem está esperando
   * a van, e a forma a separa de todo o resto.
   */
  forma?: "padrao" | "pilula";
}

/**
 * Botão base — ver nota de escopo em `vehicle-screen.tsx`. `radius.lg`
 * (redesign 15/09/2026, mesma troca do `VehicleCard`).
 */
export function VehicleButton({
  label,
  onPress,
  variant = "primary",
  isLoading = false,
  disabled = false,
  icon,
  forma = "padrao",
}: VehicleButtonProps): JSX.Element {
  const { theme } = useTheme();
  const isDisabled = disabled || isLoading;

  const backgroundColor =
    variant === "primary"
      ? theme.colors.primary
      : variant === "danger"
        ? theme.colors.danger
        : variant === "secondary"
          ? theme.colors.surfaceElevated
          : "transparent";
  const textColor =
    variant === "primary" || variant === "danger" ? theme.colors.onPrimary : theme.colors.text;
  const borderColor = variant === "ghost" ? "transparent" : theme.colors.border;

  return (
    <Pressable
      accessibilityRole="button"
      /*
        Sem estas duas linhas o leitor de tela anunciava o botão como se
        estivesse disponível mesmo desabilitado, e durante o
        carregamento perdia o rótulo por completo: o texto some da tela
        e só fica o indicador girando, que não tem o que anunciar. A
        pessoa ouvia "botão" e nada mais, sem saber se apertou, se
        funcionou, nem o que aquilo era.
      */
      accessibilityLabel={label}
      accessibilityState={{ disabled: isDisabled, busy: isLoading }}
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor,
          borderColor,
          borderWidth: variant === "secondary" ? 1 : 0,
          opacity: isDisabled ? 0.6 : pressed ? 0.85 : 1,
          paddingVertical: theme.spacing[4],
          paddingHorizontal: theme.spacing[6],
          borderRadius: forma === "pilula" ? theme.radius.full : theme.radius.lg,
        },
      ]}
    >
      {isLoading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <View style={styles.content}>
          {icon}
          <Texto
            style={[styles.label, { color: textColor, fontSize: theme.typography.button.fontSize }]}
          >
            {label}
          </Texto>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  /* 52 pontos de altura e peso 700: no conceito o botão primário é a
     peça mais pesada da tela, e era onde o app mais parecia genérico,
     com um retângulo de 48 e texto semibold igual ao de qualquer
     formulário. */
  base: { alignItems: "center", justifyContent: "center", minHeight: 52 },
  content: { alignItems: "center", flexDirection: "row", gap: 6 },
  label: { fontWeight: "700" },
});

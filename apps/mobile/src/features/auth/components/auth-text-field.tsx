import { useState } from "react";
import { StyleSheet, Text, TextInput, View, type TextInputProps } from "react-native";

import { useTheme } from "@/providers/theme-provider";

interface AuthTextFieldProps extends TextInputProps {
  label: string;
  helperText?: string;
  /** Conteúdo extra dentro do campo, à direita (Seção 8/9 — usado pelo `PasswordInput` pro botão de mostrar/ocultar senha). */
  rightAccessory?: React.ReactNode;
}

/**
 * Campo de texto base do fluxo de entrada/autenticação (Dossiê 15) — ver
 * nota de escopo em `auth-button.tsx`. Borda muda de cor suavemente ao
 * focar (Seção 9/10 — "border muda de forma suave", também dá uma pista
 * de foco visível pra quem navega por teclado/leitor de tela externo).
 */
export function AuthTextField({
  label,
  helperText,
  rightAccessory,
  style,
  onFocus,
  onBlur,
  ...inputProps
}: AuthTextFieldProps): JSX.Element {
  const { theme } = useTheme();
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={styles.container}>
      <Text
        style={[
          styles.label,
          { color: theme.colors.textMuted, fontSize: theme.typography.caption.fontSize },
        ]}
      >
        {label}
      </Text>
      <View style={styles.inputRow}>
        <TextInput
          placeholderTextColor={theme.colors.placeholder}
          style={[
            styles.input,
            {
              backgroundColor: theme.colors.surfaceElevated,
              borderColor: isFocused ? theme.colors.primary : theme.colors.border,
              borderWidth: isFocused ? 2 : 1,
              color: theme.colors.text,
              borderRadius: theme.radius.md,
              paddingHorizontal: theme.spacing[4],
              paddingVertical: theme.spacing[3],
              fontSize: theme.typography.body.fontSize,
            },
            rightAccessory ? styles.inputWithAccessory : null,
            style,
          ]}
          onFocus={(event) => {
            setIsFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setIsFocused(false);
            onBlur?.(event);
          }}
          {...inputProps}
        />
        {rightAccessory ? <View style={styles.accessory}>{rightAccessory}</View> : null}
      </View>
      {helperText ? (
        <Text style={[styles.helper, { color: theme.colors.textMuted }]}>{helperText}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  accessory: { position: "absolute", right: 4 },
  container: { gap: 6 },
  helper: { fontSize: 12 },
  input: { flex: 1 },
  inputRow: { justifyContent: "center" },
  inputWithAccessory: { paddingRight: 44 },
  label: { fontWeight: "600" },
});

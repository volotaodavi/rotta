import { StyleSheet, Text, TextInput, View, type TextInputProps } from "react-native";

import { useTheme } from "@/providers/theme-provider";

interface AuthTextFieldProps extends TextInputProps {
  label: string;
  helperText?: string;
}

/**
 * Campo de texto base do fluxo de entrada/autenticação (Dossiê 15) — ver
 * nota de escopo em `auth-button.tsx`.
 */
export function AuthTextField({
  label,
  helperText,
  style,
  ...inputProps
}: AuthTextFieldProps): JSX.Element {
  const { theme } = useTheme();

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
      <TextInput
        placeholderTextColor={theme.colors.placeholder}
        style={[
          styles.input,
          {
            backgroundColor: theme.colors.surfaceElevated,
            borderColor: theme.colors.border,
            color: theme.colors.text,
            borderRadius: theme.radius.md,
            paddingHorizontal: theme.spacing[4],
            paddingVertical: theme.spacing[3],
            fontSize: theme.typography.body.fontSize,
          },
          style,
        ]}
        {...inputProps}
      />
      {helperText ? (
        <Text style={[styles.helper, { color: theme.colors.textMuted }]}>{helperText}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 6 },
  helper: { fontSize: 12 },
  input: { borderWidth: 1 },
  label: { fontWeight: "600" },
});

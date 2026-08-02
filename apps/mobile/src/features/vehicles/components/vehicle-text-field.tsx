import { StyleSheet, Text, TextInput, View, type TextInputProps } from "react-native";

import { useTheme } from "@/providers/theme-provider";

interface VehicleTextFieldProps extends TextInputProps {
  label: string;
}

/** Campo de texto base das telas de Veículos — ver nota de escopo em `vehicle-screen.tsx`. */
export function VehicleTextField({
  label,
  style,
  ...inputProps
}: VehicleTextFieldProps): JSX.Element {
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 6 },
  input: { borderWidth: 1 },
  label: { fontWeight: "600" },
});

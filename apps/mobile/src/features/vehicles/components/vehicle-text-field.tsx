import { StyleSheet, Text, TextInput, View, type TextInputProps } from "react-native";

import { useTheme } from "@/providers/theme-provider";

interface VehicleTextFieldProps extends TextInputProps {
  label: string;
}

/**
 * Campo de texto base — ver nota de escopo em `vehicle-screen.tsx`.
 * `radius.lg` (redesign 15/09/2026, mesma troca de `VehicleCard`).
 */
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
        /*
          O rótulo acima é um `Text` solto: visualmente ele etiqueta o
          campo, e para o leitor de tela não etiqueta nada. Sem esta
          linha, quem usa TalkBack ou VoiceOver chega num formulário da
          Rotta e ouve "campo de edição" em todos os campos, sem saber
          qual é o CPF, qual é a placa e qual é o endereço de embarque.
          Entrou em 16/10/2026, e vale para TODO formulário do app, que
          é onde o funil medido morre: 3 checkouts iniciados, 3
          abandonados.

          `accessibilityLabel` no próprio input, e não
          `accessibilityLabelledBy`, porque este último depende de
          `nativeID` e só funciona no Android.
        */
        accessibilityLabel={label}
        placeholderTextColor={theme.colors.placeholder}
        style={[
          styles.input,
          {
            backgroundColor: theme.colors.surfaceElevated,
            borderColor: theme.colors.border,
            color: theme.colors.text,
            borderRadius: theme.radius.lg,
            paddingHorizontal: theme.spacing[4],
            paddingVertical: theme.spacing[3] + 2,
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

import { Eye, EyeOff } from "@rotta/icons/native";
import { useState } from "react";
import { Pressable } from "react-native";


import { AuthTextField } from "./auth-text-field";

import type { TextInputProps } from "react-native";

import { useTheme } from "@/providers/theme-provider";

interface PasswordInputProps extends Omit<TextInputProps, "secureTextEntry"> {
  label: string;
  helperText?: string;
}

/**
 * Campo de senha com alternância de visibilidade (Seção 4/8 — "Senha
 * 👁", paridade com `SenhaField` de `apps/web/.../entrar/page.tsx`).
 * Reaproveita `AuthTextField` (label/foco/helper já resolvidos ali) só
 * acrescentando o botão de olho como `rightAccessory` — nenhuma
 * duplicação de estilo de input.
 */
export function PasswordInput({ label, ...rest }: PasswordInputProps): JSX.Element {
  const { theme } = useTheme();
  const [visible, setVisible] = useState(false);

  return (
    <AuthTextField
      label={label}
      secureTextEntry={!visible}
      autoCapitalize="none"
      autoCorrect={false}
      rightAccessory={
        <Pressable
          onPress={() => setVisible((current) => !current)}
          accessibilityRole="button"
          accessibilityLabel={visible ? "Ocultar senha" : "Mostrar senha"}
          hitSlop={8}
          style={{ padding: 10 }}
        >
          {visible ? (
            <EyeOff size={20} color={theme.colors.textMuted} />
          ) : (
            <Eye size={20} color={theme.colors.textMuted} />
          )}
        </Pressable>
      }
      {...rest}
    />
  );
}

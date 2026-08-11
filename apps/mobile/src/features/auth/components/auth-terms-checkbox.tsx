import { Check } from "@rotta/icons/native";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";

import { env } from "@/config/env";
import { useTheme } from "@/providers/theme-provider";

/**
 * Checkbox de aceite dos Termos de Uso/Política de Privacidade
 * (Dossiê 34 — Prompt 25). Antes desta entrega, `CriarContaPessoal` e
 * `ConviteCodigo` enviavam `aceiteTermos: true` fixo — nenhum usuário
 * jamais viu ou marcou um aceite real. Mesmo motivo do `AuthButton`
 * (não é `@rotta/ui/native` — nenhum Design System nativo existe
 * ainda): implementação mínima local à feature, não um átomo Checkbox
 * completo (esse existe do lado web, `@rotta/ui/web`, Dossiê 34 §2.5 —
 * portá-lo para nativo é trabalho futuro, não bloqueia este fix).
 *
 * Os Termos/Política em si vivem só no site (`apps/web` —
 * `/legal/termos`, `/legal/privacidade` — Dossiê 45); aqui abrem no
 * navegador do sistema (`Linking`), não numa WebView interna, porque é
 * conteúdo de leitura simples, sem nenhuma interação que precise ficar
 * dentro do app.
 */
export function AuthTermsCheckbox({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
}): JSX.Element {
  const { theme } = useTheme();

  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked }}
        onPress={() => onChange(!checked)}
        style={[
          styles.box,
          {
            borderColor: checked ? theme.colors.primary : theme.colors.border,
            backgroundColor: checked ? theme.colors.primary : "transparent",
          },
        ]}
      >
        {checked ? <Check size={13} color="#FFFFFF" strokeWidth={3} /> : null}
      </Pressable>
      <Text style={[styles.label, { color: theme.colors.textMuted }]}>
        Li e aceito os{" "}
        <Text
          style={{ color: theme.colors.primary, fontWeight: "600" }}
          onPress={() => void Linking.openURL(`${env.EXPO_PUBLIC_WEB_URL}/legal/termos`)}
        >
          Termos de Uso
        </Text>{" "}
        e a{" "}
        <Text
          style={{ color: theme.colors.primary, fontWeight: "600" }}
          onPress={() => void Linking.openURL(`${env.EXPO_PUBLIC_WEB_URL}/legal/privacidade`)}
        >
          Política de Privacidade
        </Text>{" "}
        da Rotta.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    alignItems: "center",
    borderRadius: 4,
    borderWidth: 1.5,
    height: 20,
    justifyContent: "center",
    marginTop: 2,
    width: 20,
  },
  label: { flex: 1, fontSize: 13, lineHeight: 18 },
  row: { flexDirection: "row", gap: 8 },
});

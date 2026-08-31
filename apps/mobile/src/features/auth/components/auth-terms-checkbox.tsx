import { Check, X } from "@rotta/icons/native";
import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";

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
 * Termos/Política abrem numa WebView interna sobre a própria tela de
 * cadastro (`Modal` + `react-native-webview`, mesmo padrão de
 * `CriarEmpresaWebViewScreen`/`LegalWebViewScreen`) — pedido explícito
 * do usuário: nenhum passo do fluxo de criar conta deve tirar a pessoa
 * do app pro navegador do sistema. Antes usava `Linking.openURL`.
 */
export function AuthTermsCheckbox({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
}): JSX.Element {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [documento, setDocumento] = useState<"termos" | "privacidade" | null>(null);

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
          onPress={() => setDocumento("termos")}
        >
          Termos de Uso
        </Text>{" "}
        e a{" "}
        <Text
          style={{ color: theme.colors.primary, fontWeight: "600" }}
          onPress={() => setDocumento("privacidade")}
        >
          Política de Privacidade
        </Text>{" "}
        da Rotta.
      </Text>

      <Modal
        visible={documento !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setDocumento(null)}
      >
        <View style={[styles.webviewRoot, { backgroundColor: theme.colors.background }]}>
          <View
            style={[
              styles.webviewHeader,
              { borderBottomColor: theme.colors.border, paddingTop: insets.top + 8 },
            ]}
          >
            <Text style={[styles.webviewTitle, { color: theme.colors.text }]}>
              {documento === "termos" ? "Termos de Uso" : "Política de Privacidade"}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Fechar"
              onPress={() => setDocumento(null)}
              hitSlop={8}
            >
              <X size={22} color={theme.colors.textMuted} />
            </Pressable>
          </View>
          {documento ? (
            <WebView
              source={{
                uri: `${env.EXPO_PUBLIC_WEB_URL}/legal/${documento === "termos" ? "termos" : "privacidade"}`,
              }}
              style={styles.flex}
            />
          ) : null}
        </View>
      </Modal>
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
  flex: { flex: 1 },
  label: { flex: 1, fontSize: 13, lineHeight: 18 },
  row: { flexDirection: "row", gap: 8 },
  webviewHeader: {
    alignItems: "center",
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingBottom: 12,
    paddingHorizontal: 16,
  },
  webviewRoot: { flex: 1 },
  webviewTitle: { fontSize: 16, fontWeight: "700" },
});

import { StyleSheet, Text, View } from "react-native";
import { WebView } from "react-native-webview";


import { AuthButton } from "../components";

import type { AuthStackParamList } from "@/navigation/types";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { env } from "@/config/env";
import { useTheme } from "@/providers/theme-provider";

type Props = NativeStackScreenProps<AuthStackParamList, "CriarEmpresaWebView">;

/**
 * "Criar Empresa" (Dossiê 15, `AUTH-01`) — "Selecionar 'Criar Empresa' deve
 * abrir uma WebView integrada no aplicativo — nunca um navegador externo."
 * A URL nunca é hardcoded (`EXPO_PUBLIC_WEB_URL`: `localhost:3000` em dev,
 * domínio real em produção).
 *
 * O cadastro roda dentro da sessão web (própria da WebView, isolada da
 * sessão nativa do app) e cria Empresa + Tenant + Administrador + Plano —
 * a mesma conta. Ao concluir, o usuário fecha a WebView e apenas faz Login
 * no app ("não solicitar novo cadastro, não solicitar ativação adicional").
 */
export function CriarEmpresaWebViewScreen({ navigation }: Props): JSX.Element {
  const { theme } = useTheme();

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.background }]}>
      <WebView
        source={{ uri: `${env.EXPO_PUBLIC_WEB_URL}/criar-conta/empresa` }}
        style={styles.flex}
      />
      <View
        style={[
          styles.footer,
          {
            backgroundColor: theme.colors.surface,
            borderTopColor: theme.colors.border,
            padding: theme.spacing[4],
          },
        ]}
      >
        <Text style={[styles.helper, { color: theme.colors.textMuted }]}>
          Concluiu o cadastro? Volte e entre com o e-mail/telefone e a senha que você criou.
        </Text>
        <AuthButton label="Já concluí, fazer login" onPress={() => navigation.replace("Login")} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  footer: { borderTopWidth: 1, gap: 12 },
  helper: { fontSize: 13, lineHeight: 18 },
});

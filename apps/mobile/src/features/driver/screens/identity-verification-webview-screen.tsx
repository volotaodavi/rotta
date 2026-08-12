import { StyleSheet, View } from "react-native";
import { WebView } from "react-native-webview";

import { env } from "@/config/env";
import { useTheme } from "@/providers/theme-provider";

/**
 * "Verificar identidade" no app do Motorista/Monitor — mesmo padrão de
 * `LegalWebViewScreen`/`CriarEmpresaWebViewScreen`: a página
 * `/verificacao-identidade` do Painel Web (SDK `@didit-protocol/sdk-web`,
 * modal hospedado pela própria Didit) embutida numa WebView, em vez de
 * reimplementar captura de câmera/documento em React Native.
 *
 * DIFERENTE das outras duas WebViews: esta página EXIGE sessão
 * autenticada (`(dashboard)` layout). A WebView é uma sessão web isolada
 * da sessão nativa do app (mesmo `EXPO_PUBLIC_WEB_URL`, cookie/storage
 * próprios) — não existe hoje uma ponte de token entre a sessão nativa e
 * a WebView, então, se a WebView ainda não tiver login próprio, ela cai
 * na tela `/entrar` do Painel Web primeiro. O motorista usa o MESMO
 * e-mail/senha que já usa no app — não é uma conta nova, só uma segunda
 * sessão (idêntico à ideia por trás de "Já concluí, fazer login" em
 * `CriarEmpresaWebViewScreen`).
 */
export function DriverIdentityVerificationWebViewScreen(): JSX.Element {
  const { theme } = useTheme();

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.background }]}>
      <WebView
        source={{ uri: `${env.EXPO_PUBLIC_WEB_URL}/verificacao-identidade` }}
        style={styles.flex}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});

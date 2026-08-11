import { StyleSheet, View } from "react-native";
import { WebView } from "react-native-webview";

import { env } from "@/config/env";
import { useTheme } from "@/providers/theme-provider";

/**
 * "Documentação Rotta" no app (Dossiê 45 — Rotta Legal, Trust &
 * Community Center, prompt §29/§32) — mesmo padrão de
 * `CriarEmpresaWebViewScreen`: a página `/legal` já pública, sem login,
 * responsiva e com sua própria navegação lateral/expansível é embutida
 * numa WebView, em vez de recriar cada documento em React Native. A URL
 * nunca é hardcoded — `EXPO_PUBLIC_WEB_URL` já resolve para o domínio
 * certo em dev/produção (mesma variável de `CriarEmpresaWebViewScreen`).
 */
export function LegalWebViewScreen(): JSX.Element {
  const { theme } = useTheme();

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.background }]}>
      <WebView source={{ uri: `${env.EXPO_PUBLIC_WEB_URL}/legal` }} style={styles.flex} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});

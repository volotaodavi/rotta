import { AlertTriangle } from "@rotta/icons/native";
import { Linking, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AuthButton } from "@/features/auth/components";
import { buildWhatsAppUrl } from "@/lib/whatsapp";
import { useTheme } from "@/providers/theme-provider";

/**
 * Tela de bloqueio honesta pra quando a configuração do app (URL da
 * API/do Site, injetada em tempo de build) não veio — achado 15/09/2026
 * investigando dois relatos do usuário ("login com erro inesperado" e
 * "erro de render em Documentação Rotta"): ambos batem exatamente com
 * o que acontece quando `EXPO_PUBLIC_API_URL`/`EXPO_PUBLIC_WEB_URL`
 * chegam vazios (ver a nota completa em `src/config/env.ts`,
 * `isEnvConfigValid`) — login falhava com uma mensagem genérica de
 * "erro inesperado" (confuso, parece senha errada) e as telas de
 * WebView recebiam uma URL relativa inválida.
 *
 * Em vez de deixar cada tela falhar (e cada uma com uma mensagem
 * diferente e pouco clara), o app inteiro para AQUI, antes de
 * `RootNavigator` sequer tentar montar (`App.tsx`), com uma explicação
 * honesta e uma ação real (WhatsApp do suporte — não depende de
 * `env`, é um número fixo). Não é um `AppErrorBoundary` genérico: essa
 * tela SABE exatamente qual é o problema, então diz exatamente isso,
 * em vez de "Algo deu errado".
 */
export function AppConfigErrorScreen(): JSX.Element {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  function handleFalarComSuporte(): void {
    Linking.openURL(
      buildWhatsAppUrl(
        "Olá! Abri o app da Rotta e apareceu uma mensagem de configuração ausente — preciso de ajuda.",
      ),
    ).catch(() => {
      // Best-effort, mesmo padrão de todo `Linking.openURL` do app —
      // sem WhatsApp instalado, o toque simplesmente não faz nada visível.
    });
  }

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.background,
          paddingTop: insets.top + theme.spacing[8],
          paddingBottom: insets.bottom + theme.spacing[6],
          paddingHorizontal: theme.spacing[6],
        },
      ]}
    >
      {/* `1A` = alpha ~10% sobre o hex — mesmo truque já usado em
          `inicio-screen.tsx` (`avisoVeiculoIcone`) pra um círculo de
          aviso tingido sem precisar de um token `dangerMuted` novo. */}
      <View style={[styles.iconWrap, { backgroundColor: `${theme.colors.danger}1A` }]}>
        <AlertTriangle size={28} color={theme.colors.danger} />
      </View>

      <Text
        style={[
          styles.title,
          { color: theme.colors.text, fontSize: theme.typography.title.fontSize },
        ]}
      >
        Não foi possível carregar o app
      </Text>
      <Text style={[styles.body, { color: theme.colors.textMuted }]}>
        A configuração deste aplicativo não veio completa. Isso não é um problema da sua conta —
        feche e abra o app de novo; se continuar acontecendo, fale com o nosso suporte.
      </Text>

      <AuthButton label="Falar com o suporte" onPress={handleFalarComSuporte} />
    </View>
  );
}

const styles = StyleSheet.create({
  body: { fontSize: 14, lineHeight: 21, marginBottom: 24, textAlign: "center" },
  container: { alignItems: "center", flex: 1, justifyContent: "center" },
  iconWrap: {
    alignItems: "center",
    borderRadius: 9999,
    height: 64,
    justifyContent: "center",
    marginBottom: 20,
    width: 64,
  },
  title: { fontWeight: "700", marginBottom: 8, textAlign: "center" },
});

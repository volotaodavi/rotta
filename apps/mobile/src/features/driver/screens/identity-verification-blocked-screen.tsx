import { useAuth } from "@rotta/auth/native";
import { StyleSheet, View } from "react-native";

import { IdentityVerificationStatusCard } from "../components";

import { AuthButton } from "@/features/auth/components";
import { useTheme } from "@/providers/theme-provider";

/**
 * Bloqueio total do app enquanto `identityVerificationStatus !==
 * "APROVADA"` (Frente J, reescrita 12/09/2026 — pedido do usuário: "não
 * deve parecer com a web, mas sim o app próprio... você se preocupou
 * tanto com a web que esqueceu do app").
 *
 * ANTES: esta tela embutia a página `/verificacao-identidade` do
 * Painel Web inteira numa WebView — visualmente web (fontes/botões do
 * `@rotta/ui/web`) e, pior, tecnicamente quebrado: aquela página exige
 * uma sessão web PRÓPRIA (cookie isolado, sem ponte com a sessão
 * nativa), então a pessoa caía na tela de LOGIN da Web de novo, mesmo
 * já logada no app.
 *
 * AGORA: `RootNavigator` renderiza esta casca 100% nativa (avatar/
 * texto/logout do app) em volta de `IdentityVerificationStatusCard`
 * (mesmo card usado pela entrada voluntária no Perfil,
 * `VerificacaoIdentidadeScreen`) — a lógica de status/sessão/WebView é
 * só dela, ver esse arquivo.
 */
export function IdentityVerificationBlockedScreen(): JSX.Element {
  const { theme } = useTheme();
  const { logout } = useAuth();

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.colors.background, padding: theme.spacing[6] },
      ]}
    >
      <IdentityVerificationStatusCard />
      <AuthButton label="Sair" variant="ghost" onPress={() => void logout()} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: "stretch", flex: 1, gap: 16, justifyContent: "center" },
});

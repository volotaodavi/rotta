import { useAuth } from "@rotta/auth/native";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { AuthButton } from "@/features/auth/components";
import { useMyIdentityVerification } from "@/features/driver/hooks/use-identity-verification";
import { DriverIdentityVerificationWebViewScreen } from "@/features/driver/screens/identity-verification-webview-screen";
import { useTheme } from "@/providers/theme-provider";

/**
 * Bloqueio total do app enquanto `identityVerificationStatus !==
 * "APROVADA"` (Frente J, ampliado 12/09/2026 — pedido do usuário:
 * "Mais fácil, pegue oq está na web e traga para o app" — em vez de
 * reimplementar em React Native a copy por status de
 * `apps/web/.../identity-verification-block-screen.tsx`
 * (NAO_INICIADA/EM_ANDAMENTO/EM_ANALISE/REPROVADA/EXPIRADA, cada um com
 * texto e botão certos), esta tela SEMPRE embute a própria página Web
 * `/verificacao-identidade` — ela já resolve tudo isso (texto certo por
 * status, "Verificar agora"/"Tentar novamente"/"Atualizar status", SDK
 * da Didit) e nunca fica dessincronizada da Web de novo, porque é a
 * mesma tela.
 *
 * ANTES desta mudança, a tela mostrava sempre a copy fixa de
 * "REPROVADA" — errado pra quem nunca tinha começado (`NAO_INICIADA`)
 * ou estava só aguardando análise (`EM_ANALISE`): mostrava "verificação
 * recusada" pra quem nunca tinha sido recusado.
 *
 * `RootNavigator` renderiza esta tela NO LUGAR do navigator do papel
 * inteiro — nenhuma tela do app fica alcançável enquanto bloqueado. A
 * barra fixa embaixo é só o que a WebView em si não pode oferecer:
 * "Atualizar" (refaz a consulta do LADO NATIVO — a WebView é uma sessão
 * isolada, sem ponte de token com o app; o SDK da Didit e o botão
 * "Atualizar status" de dentro da WebView mudam o status no banco, mas
 * só um `refetch()` daqui faz o `RootNavigator` notar e desbloquear) e
 * "Sair" (única saída, já que não existe pra onde "voltar").
 */
export function IdentityVerificationBlockedScreen(): JSX.Element {
  const { theme } = useTheme();
  const { logout } = useAuth();
  const { refetch, isFetching } = useMyIdentityVerification();

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.background }]}>
      <DriverIdentityVerificationWebViewScreen />
      <View style={[styles.bottomBar, { backgroundColor: theme.colors.surfaceElevated }]}>
        {isFetching ? (
          <ActivityIndicator color={theme.colors.primary} />
        ) : (
          <AuthButton label="Atualizar" variant="ghost" onPress={() => void refetch()} />
        )}
        <AuthButton label="Sair" variant="secondary" onPress={() => void logout()} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bottomBar: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    padding: 12,
  },
  flex: { flex: 1 },
});

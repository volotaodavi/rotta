import { useAuth } from "@rotta/auth/native";
import { ShieldAlert } from "@rotta/icons/native";
import { useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { AuthButton } from "@/features/auth/components";
import { useMyIdentityVerification } from "@/features/driver/hooks/use-identity-verification";
import { DriverIdentityVerificationWebViewScreen } from "@/features/driver/screens/identity-verification-webview-screen";
import { useTheme } from "@/providers/theme-provider";

/**
 * Bloqueio total do app quando `identityVerificationStatus ===
 * "REPROVADA"` (Frente J — mesmo pedido do bloqueio já entregue no
 * Painel Web: "não deixe ele acessar nada. Deixe apenas a opção de
 * tentar verificação no Didit novamente"). `RootNavigator` renderiza
 * esta tela NO LUGAR de `DriverNavigator` inteiro — nenhuma tela do
 * app fica alcançável enquanto bloqueado, só "Tentar novamente" (abre
 * a mesma WebView `/verificacao-identidade` já usada no Perfil) e
 * "Sair".
 *
 * "Tentar novamente" desbloqueia sozinho assim que uma nova sessão é
 * criada — `IdentityVerificationService.createSession` já marca
 * `EM_ANDAMENTO` no banco na mesma chamada (ver
 * `identity-verification-webview-screen.tsx`/página web equivalente),
 * então o próximo refetch deste hook já sai do estado bloqueado, mesmo
 * que a pessoa feche a WebView sem concluir o formulário.
 */
export function IdentityVerificationBlockedScreen(): JSX.Element {
  const { theme } = useTheme();
  const { logout } = useAuth();
  const { data, refetch, isFetching } = useMyIdentityVerification();
  const [tentandoNovamente, setTentandoNovamente] = useState(false);

  if (tentandoNovamente) {
    return (
      <View style={styles.flex}>
        <DriverIdentityVerificationWebViewScreen />
        <View style={[styles.backBar, { backgroundColor: theme.colors.surfaceElevated }]}>
          <AuthButton
            label="Voltar"
            variant="ghost"
            onPress={() => {
              setTentandoNovamente(false);
              void refetch();
            }}
          />
        </View>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.colors.background, padding: theme.spacing[6] },
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: `${theme.colors.danger}20` }]}>
        <ShieldAlert size={28} color={theme.colors.danger} />
      </View>
      <Text
        style={[
          styles.title,
          { color: theme.colors.text, fontSize: theme.typography.title.fontSize },
        ]}
      >
        Verificação de identidade recusada
      </Text>
      <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>
        {data?.motivo ?? "Sua verificação de identidade não foi aprovada."}
      </Text>
      <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>
        O acesso ao app fica bloqueado até você refazer a verificação.
      </Text>
      {isFetching ? (
        <ActivityIndicator color={theme.colors.primary} />
      ) : (
        <AuthButton
          label="Tentar verificação novamente"
          onPress={() => setTentandoNovamente(true)}
        />
      )}
      <AuthButton label="Sair" variant="secondary" onPress={() => void logout()} />
    </View>
  );
}

const styles = StyleSheet.create({
  backBar: { alignItems: "flex-start", padding: 12 },
  container: { alignItems: "center", flex: 1, gap: 16, justifyContent: "center" },
  flex: { flex: 1 },
  iconWrap: {
    alignItems: "center",
    borderRadius: 999,
    height: 56,
    justifyContent: "center",
    width: 56,
  },
  subtitle: { fontSize: 14, lineHeight: 20, textAlign: "center" },
  title: { fontWeight: "600", textAlign: "center" },
});

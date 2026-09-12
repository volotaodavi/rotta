import { useAuth } from "@rotta/auth/native";
import { Lock } from "@rotta/icons/native";
import { StyleSheet, Text, View } from "react-native";

import { VehicleButton } from "@/features/vehicles/components";
import { useTheme } from "@/providers/theme-provider";

/**
 * Bloqueio da área Empresa/Gestor no app quando `user.billingBlocked`
 * (Dossiê 26 — trial vencido/inadimplente/suspenso/cancelado). Mesma
 * regra já aplicada na Web (`apps/web/src/app/(dashboard)/layout.tsx`,
 * `BillingBlockScreen`), só mais simples: a Web libera `/chamados` e
 * `/assinatura` mesmo bloqueada (pra dar suporte e permitir pagar),
 * mas nenhuma das duas telas existe no escopo reduzido do app ainda —
 * então aqui o bloqueio é do app inteiro, com a orientação de resolver
 * pelo site. `RootNavigator` renderiza esta tela NO LUGAR de
 * `EmpresaNavigator` inteiro, mesmo padrão de
 * `IdentityVerificationBlockedScreen` pro Motorista/Monitor.
 */
export function EmpresaBillingBlockedScreen({ reason }: { reason: string | null }): JSX.Element {
  const { theme } = useTheme();
  const { logout } = useAuth();

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.colors.background, padding: theme.spacing[6] },
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: `${theme.colors.warning}20` }]}>
        <Lock size={28} color={theme.colors.warning} />
      </View>
      <Text
        style={[
          styles.title,
          { color: theme.colors.text, fontSize: theme.typography.title.fontSize },
        ]}
      >
        Assinatura pendente
      </Text>
      <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>
        {reason ?? "Sua assinatura da Rotta precisa ser regularizada."}
      </Text>
      <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>
        Acesse o Painel Web da Rotta pelo navegador pra regularizar o pagamento ou falar com o
        suporte. O acesso ao app fica bloqueado até lá.
      </Text>
      <VehicleButton label="Sair" variant="secondary" onPress={() => void logout()} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: "center", flex: 1, gap: 16, justifyContent: "center" },
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

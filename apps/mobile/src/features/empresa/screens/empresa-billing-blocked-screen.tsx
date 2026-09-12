import { useAuth } from "@rotta/auth/native";
import { Lock } from "@rotta/icons/native";
import { Linking, StyleSheet, Text, View } from "react-native";

import { env } from "@/config/env";
import { VehicleButton } from "@/features/vehicles/components";
import { useTheme } from "@/providers/theme-provider";

/**
 * Bloqueio da área Empresa/Gestor no app quando `user.billingBlocked`
 * (Dossiê 26 — trial vencido/inadimplente/suspenso/cancelado). Mesma
 * regra já aplicada na Web (`apps/web/src/app/(dashboard)/layout.tsx`,
 * `BillingBlockScreen`), só mais simples: a Web libera `/chamados` e
 * `/assinatura` mesmo bloqueada (pra dar suporte e permitir pagar),
 * mas nenhuma das duas telas existe no escopo reduzido do app ainda —
 * então aqui o bloqueio é do app inteiro.
 *
 * "Regularizar pagamento" (12/09/2026 — antes só um texto dizendo "vá
 * pro navegador", sem link nenhum — a pessoa tinha que digitar a URL
 * de cabeça) abre o navegador do sistema direto em `/assinatura`.
 * Nunca uma WebView aqui: `/assinatura` fica dentro do Painel Web
 * autenticado (mesmo problema que a verificação de identidade tinha —
 * sessão web isolada, sem ponte com a nativa) — abrir no navegador de
 * verdade é honesto sobre "você está saindo do app", em vez de fingir
 * uma tela nativa que na prática pede login de novo. Cobrança dentro
 * do próprio app fica de fora de propósito (risco de política de
 * faturamento in-app da Google Play para um app já na loja).
 *
 * `RootNavigator` renderiza esta tela NO LUGAR de `EmpresaNavigator`
 * inteiro, mesmo padrão de `IdentityVerificationBlockedScreen` pro
 * Motorista/Monitor.
 */
export function EmpresaBillingBlockedScreen({ reason }: { reason: string | null }): JSX.Element {
  const { theme } = useTheme();
  const { logout } = useAuth();

  function abrirAssinatura(): void {
    Linking.openURL(`${env.EXPO_PUBLIC_WEB_URL}/assinatura`).catch(() => {
      // Sem navegador disponível — sem fallback silencioso, mesmo
      // padrão dos outros `Linking.openURL` do app.
    });
  }

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
        O acesso ao app fica bloqueado até o pagamento ser regularizado no navegador.
      </Text>
      <VehicleButton label="Regularizar pagamento" onPress={abrirAssinatura} />
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

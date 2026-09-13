import { Sparkles } from "@rotta/icons/native";
import { Linking, StyleSheet, Text, View } from "react-native";

import type { Company } from "@rotta/api-client";

import { env } from "@/config/env";
import { StatusPill, VehicleButton, VehicleCard } from "@/features/vehicles/components";
import { useTheme } from "@/providers/theme-provider";

const MS_DIA = 24 * 60 * 60 * 1000;

/**
 * "Expira em N dias"/"Expirado há N dias" a partir de `trialExpiraEm` —
 * mesmo cálculo de `apps/web/src/app/(dashboard)/empresa/page.tsx#contagemTrial`,
 * nunca duplicar a fórmula com um resultado diferente entre as duas telas.
 */
function contagemTrial(trialExpiraEm: string | null): { texto: string; urgente: boolean } | null {
  if (!trialExpiraEm) return null;
  const diasRestantes = Math.ceil((new Date(trialExpiraEm).getTime() - Date.now()) / MS_DIA);
  if (diasRestantes > 0) {
    return {
      texto: `Expira em ${diasRestantes} dia${diasRestantes === 1 ? "" : "s"}`,
      urgente: diasRestantes <= 3,
    };
  }
  const diasVencido = Math.abs(diasRestantes);
  return {
    texto:
      diasVencido === 0
        ? "Vence hoje"
        : `Expirado há ${diasVencido} dia${diasVencido === 1 ? "" : "s"}`,
    urgente: true,
  };
}

/**
 * Banner "período de teste" — pedido do usuário 13/09/2026 ("pode fazer
 * a questão do plano vencendo no app nativo também"): a Web já avisava
 * a contagem regressiva do trial antes do bloqueio duro
 * (`EmpresaBillingBlockedScreen`/`BillingBlockScreen`), o app só tinha o
 * bloqueio em si, sem aviso prévio nenhum. Mirror 1:1 de
 * `apps/web/src/app/(dashboard)/empresa/page.tsx#TrialBanner` — mesmo
 * texto, mesmo corte de urgência (≤3 dias), mesmo destino do botão
 * ("Assinar agora" → `/assinatura` no navegador, nunca checkout dentro
 * do app — mesma razão da tela de bloqueio: risco de faturamento in-app
 * da Play Store).
 *
 * Só renderiza durante `status === "TRIAL"` — depois disso vira
 * bloqueio duro (`RootNavigator`), este banner nem chega a montar.
 */
export function TrialBanner({ company }: { company: Company }): JSX.Element | null {
  const { theme } = useTheme();

  if (company.status !== "TRIAL") return null;
  const contagem = contagemTrial(company.trialExpiraEm);

  function assinarAgora(): void {
    Linking.openURL(`${env.EXPO_PUBLIC_WEB_URL}/assinatura`).catch(() => {
      // Sem navegador disponível — sem fallback silencioso, mesmo padrão
      // dos outros `Linking.openURL` do app (ver `EmpresaBillingBlockedScreen`).
    });
  }

  return (
    <VehicleCard style={{ borderColor: theme.colors.primary, gap: 10 }}>
      <View style={styles.header}>
        <View style={[styles.iconWrap, { backgroundColor: `${theme.colors.primary}26` }]}>
          <Sparkles size={18} color={theme.colors.primary} />
        </View>
        <View style={styles.headerTexto}>
          <View style={styles.badgesRow}>
            <Text style={[styles.titulo, { color: theme.colors.text }]}>Período de teste</Text>
            <StatusPill label="Trial" tone="info" />
            {contagem ? (
              <StatusPill label={contagem.texto} tone={contagem.urgente ? "danger" : "neutral"} />
            ) : null}
          </View>
          <Text style={{ color: theme.colors.textMuted, fontSize: 13, lineHeight: 18 }}>
            Sua empresa está em período de teste gratuito. Assine o plano Starter (R$ 39,90/mês)
            para continuar usando a plataforma sem interrupções.
          </Text>
        </View>
      </View>
      <VehicleButton label="Assinar agora" onPress={assinarAgora} />
    </VehicleCard>
  );
}

const styles = StyleSheet.create({
  badgesRow: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: 6 },
  header: { flexDirection: "row", gap: 10 },
  headerTexto: { flex: 1, gap: 4 },
  iconWrap: {
    alignItems: "center",
    borderRadius: 999,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  titulo: { fontSize: 15, fontWeight: "600" },
});

import { useAuth } from "@rotta/auth/native";
import { ExternalLink } from "@rotta/icons/native";
import { ActivityIndicator, Linking, StyleSheet, Text, View } from "react-native";

import { useMyCompanyPayments } from "../hooks/use-empresa-billing";
import { useMyCompany } from "../hooks/use-empresa-company";

import type { StatusPillTone } from "@/features/vehicles/components";
import type { CompanyStatus } from "@rotta/api-client";

import { env } from "@/config/env";
import {
  StatusPill,
  VehicleButton,
  VehicleCard,
  VehicleScreen,
} from "@/features/vehicles/components";
import { useTheme } from "@/providers/theme-provider";

const STATUS_LABEL: Record<CompanyStatus, string> = {
  TRIAL: "Período de teste",
  ATIVO: "Assinatura ativa",
  INADIMPLENTE: "Pagamento em atraso",
  SUSPENSO: "Assinatura suspensa",
  CANCELADO: "Assinatura cancelada",
};

const STATUS_TONE: Record<CompanyStatus, StatusPillTone> = {
  TRIAL: "info",
  ATIVO: "success",
  INADIMPLENTE: "danger",
  SUSPENSO: "danger",
  CANCELADO: "neutral",
};

/**
 * Rótulo do status de um pagamento do extrato. A API devolve o status
 * cru da Asaas (`string`, não um union) — por isso o `Record` tem
 * fallback pro próprio valor em vez de um `Record<Union, string>`:
 * traduzir só o que conhecemos e mostrar o resto como veio é mais
 * honesto que esconder um status novo atrás de um "—".
 */
const PAGAMENTO_STATUS_LABEL: Record<string, string> = {
  CONFIRMED: "Confirmado",
  RECEIVED: "Recebido",
  PENDING: "Aguardando pagamento",
  OVERDUE: "Vencido",
  REFUNDED: "Estornado",
  CANCELED: "Cancelado",
};

const METODO_LABEL: Record<string, string> = {
  PIX: "Pix",
  CREDIT_CARD: "Cartão de crédito",
  DEBIT_CARD: "Cartão de débito",
  BOLETO: "Boleto",
  UNDEFINED: "Não informado",
};

function formatarReais(centavos: number): string {
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatarData(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

/**
 * "Assinatura" do transportador no app (15/09/2026, pedido do usuário:
 * "crie a área de assinaturas para os transportadores... assim eles
 * podem pagar diretamente a Rotta pelo app").
 *
 * Mostra no app, paga no navegador — decisão do usuário entre as três
 * opções apresentadas. O pagamento em si NÃO acontece aqui de
 * propósito: cobrar assinatura digital dentro de um app publicado na
 * Play Store cai na política de faturamento in-app do Google (exigiria
 * Google Play Billing, com comissão sobre cada assinatura e risco de
 * reprovação/suspensão se cobrado por fora). Mesma razão já registrada
 * em `EmpresaBillingBlockedScreen` e `TrialBanner`, que também mandam
 * pro navegador — e navegador de verdade, nunca WebView: `/assinatura`
 * fica dentro do Painel Web autenticado, e uma WebView pediria login de
 * novo (a sessão web é isolada da nativa).
 *
 * O que é novo aqui é o extrato: antes o transportador não tinha COMO
 * ver os próprios pagamentos no app (a única rota de histórico era de
 * `Role.ADMIN_ROTTA`). Esta tela usa `GET /billing/company/payments`,
 * criado junto com ela, escopado pelo `tenantId` do token.
 */
export function EmpresaAssinaturaScreen(): JSX.Element {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { data: company, isLoading: carregandoEmpresa } = useMyCompany(user?.companyId);
  const { data: extrato, isLoading: carregandoExtrato, isError } = useMyCompanyPayments();

  function abrirCheckout(): void {
    Linking.openURL(`${env.EXPO_PUBLIC_WEB_URL}/assinatura`).catch(() => {
      // Sem navegador disponível — mesmo padrão dos outros
      // `Linking.openURL` do app, sem fallback silencioso.
    });
  }

  return (
    <VehicleScreen>
      <VehicleCard>
        {carregandoEmpresa || !company ? (
          <ActivityIndicator color={theme.colors.primary} />
        ) : (
          <>
            <View style={styles.statusRow}>
              <Text style={[styles.secao, { color: theme.colors.text }]}>Plano Starter</Text>
              <StatusPill label={STATUS_LABEL[company.status]} tone={STATUS_TONE[company.status]} />
            </View>

            {company.status === "TRIAL" && company.trialExpiraEm ? (
              <Text style={{ color: theme.colors.textMuted }}>
                Seu período de teste vai até {formatarData(company.trialExpiraEm)}.
              </Text>
            ) : null}

            {company.status === "ATIVO" ? (
              <Text style={{ color: theme.colors.textMuted }}>
                Sua assinatura está em dia. Obrigado por usar a Rotta.
              </Text>
            ) : null}

            {company.status === "INADIMPLENTE" || company.status === "SUSPENSO" ? (
              <Text style={{ color: theme.colors.textMuted }}>
                Regularize o pagamento para voltar a usar a Rotta sem interrupção.
              </Text>
            ) : null}

            {/* O botão abre o navegador, e o rótulo diz isso — nunca
                fingir que o pagamento acontece aqui dentro. */}
            {company.status !== "ATIVO" ? (
              <VehicleButton
                label="Pagar no navegador"
                icon={<ExternalLink size={18} color={theme.colors.onPrimary} />}
                onPress={abrirCheckout}
              />
            ) : (
              <VehicleButton
                label="Gerenciar assinatura no navegador"
                variant="secondary"
                icon={<ExternalLink size={18} color={theme.colors.text} />}
                onPress={abrirCheckout}
              />
            )}
          </>
        )}
      </VehicleCard>

      <Text style={[styles.secao, { color: theme.colors.text }]}>Pagamentos</Text>

      {carregandoExtrato ? (
        <ActivityIndicator color={theme.colors.primary} />
      ) : isError ? (
        <Text style={{ color: theme.colors.danger }}>
          Não foi possível carregar seus pagamentos agora.
        </Text>
      ) : !extrato || extrato.items.length === 0 ? (
        <Text style={{ color: theme.colors.textMuted }}>
          {/* `provider: "nenhum"` = a empresa ainda nem tem conta no
              provedor de pagamento, o que é diferente de "tem conta e
              nunca pagou" — dizer a mesma frase pros dois casos
              esconderia a diferença de quem está lendo. */}
          {extrato?.provider === "nenhum"
            ? "Nenhuma cobrança foi gerada ainda — isso acontece quando a assinatura é contratada."
            : "Nenhum pagamento registrado até agora."}
        </Text>
      ) : (
        <VehicleCard style={styles.lista}>
          {extrato.items.map((pagamento, index) => (
            <View
              key={pagamento.id}
              style={[
                styles.linha,
                index > 0
                  ? {
                      borderTopColor: theme.colors.border,
                      borderTopWidth: StyleSheet.hairlineWidth,
                    }
                  : null,
              ]}
            >
              <View style={styles.linhaTexto}>
                <Text style={[styles.valor, { color: theme.colors.text }]}>
                  {formatarReais(pagamento.valorCentavos)}
                </Text>
                <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>
                  {METODO_LABEL[pagamento.metodo] ?? pagamento.metodo} ·{" "}
                  {formatarData(pagamento.data)}
                </Text>
              </View>
              <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>
                {PAGAMENTO_STATUS_LABEL[pagamento.status] ?? pagamento.status}
              </Text>
            </View>
          ))}
        </VehicleCard>
      )}
    </VehicleScreen>
  );
}

const styles = StyleSheet.create({
  linha: { alignItems: "center", flexDirection: "row", gap: 12, paddingVertical: 12 },
  linhaTexto: { flex: 1, gap: 2 },
  lista: { gap: 0, paddingVertical: 0 },
  secao: { fontSize: 16, fontWeight: "700" },
  statusRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    justifyContent: "space-between",
  },
  valor: { fontSize: 16, fontWeight: "600" },
});

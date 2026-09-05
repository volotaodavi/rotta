import { useAuth } from "@rotta/auth/native";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";


import { BarBreakdownChart } from "../components";
import { useAdminBillingBalance, useAdminBillingOverview } from "../hooks/use-admin-billing";

import type { AdminFinanceiroStackParamList } from "@/navigation/types";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import {
  StatusPill,
  VehicleButton,
  VehicleCard,
  VehicleScreen,
} from "@/features/vehicles/components";
import { useTheme } from "@/providers/theme-provider";

type Props = NativeStackScreenProps<AdminFinanceiroStackParamList, "Overview">;

function centsToBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/**
 * Financeiro completo do Admin no app (pedido do usuário 05/09/2026:
 * "pode adicionar o financeiro completo para admins no app. Pode ser
 * útil"). Início do Financeiro — espelha
 * `apps/admin/src/app/(admin)/financeiro/page.tsx`: mensalidade da
 * plataforma (recebido/taxa retida/líquido, planos em uso, empresas
 * ativas) + saldo atual da conta Asaas da Rotta. Sem série histórica
 * fabricada em lugar nenhum — todo número aqui é o snapshot "desde
 * hoje" que a própria API já devolve.
 */
export function AdminFinanceiroOverviewScreen({ navigation }: Props): JSX.Element {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { data, isLoading, isError, refetch } = useAdminBillingOverview();
  const { data: balance } = useAdminBillingBalance();
  // Sem `adminPapel` (token antigo) cai no default seguro do resto do
  // sistema (GERAL) — mesmo raciocínio de `FinanceiroPage` (apps/admin).
  const podeTransferir = (user?.adminPapel ?? "GERAL") === "GERAL";

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  if (isError || !data) {
    return (
      <VehicleScreen>
        <Text style={{ color: theme.colors.danger }}>
          Não foi possível carregar o painel financeiro.
        </Text>
        <VehicleButton label="Tentar novamente" onPress={() => void refetch()} />
      </VehicleScreen>
    );
  }

  return (
    <VehicleScreen>
      {!data.asaas.configured ? (
        <VehicleCard>
          <StatusPill label="Asaas não configurada" tone="warning" />
          <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>
            Sem ASAAS_API_KEY — valores de Pix/cartão/boleto não podem ser consultados. Empresas e
            planos abaixo continuam corretos (vêm do banco da Rotta).
          </Text>
        </VehicleCard>
      ) : null}

      <VehicleCard>
        <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>Saldo atual (Asaas)</Text>
        <Text style={[styles.saldo, { color: theme.colors.text }]}>
          {balance?.saldoCentavos == null ? "-" : centsToBRL(balance.saldoCentavos)}
        </Text>
        <VehicleButton
          label="Ver extrato"
          variant="secondary"
          onPress={() => navigation.navigate("Extrato")}
        />
      </VehicleCard>

      <VehicleCard>
        <Text style={[styles.tituloSecao, { color: theme.colors.text }]}>
          Mensalidade da plataforma hoje
        </Text>
        <BarBreakdownChart
          formatValue={(v) =>
            v === 0 && data.totalRecebidoCentavos === null ? "-" : centsToBRL(v)
          }
          items={[
            {
              label: "Recebido",
              value: data.totalRecebidoCentavos ?? 0,
              color: theme.colors.success,
            },
            {
              label: "Taxa retida (Asaas)",
              value: data.totalTaxaRetidaCentavos ?? 0,
              color: theme.colors.warning,
            },
            {
              label: "Líquido",
              value: data.lucroLiquidoCentavos ?? 0,
              color: theme.colors.primary,
            },
          ]}
        />
        <View style={styles.linhaMuted}>
          <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>
            {data.quantidadeCobrancasPagas ?? "-"} cobranças pagas hoje
          </Text>
          <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>
            {data.quantidadeEmpresasAtivas} empresas ativas
          </Text>
        </View>
      </VehicleCard>

      {data.planos.length > 0 ? (
        <VehicleCard>
          <Text style={[styles.tituloSecao, { color: theme.colors.text }]}>Planos em uso</Text>
          <BarBreakdownChart
            formatValue={(v) => `${v} ${v === 1 ? "empresa" : "empresas"}`}
            items={data.planos.map((plano, index) => ({
              label: plano.nome,
              value: plano.quantidadeEmpresas,
              color: [
                theme.colors.primary,
                theme.colors.info,
                theme.colors.warning,
                theme.colors.success,
              ][index % 4]!,
            }))}
          />
        </VehicleCard>
      ) : null}

      <View style={styles.secao}>
        <Text style={[styles.tituloSecao, { color: theme.colors.text }]}>
          Empresas usando o plano
        </Text>
        {data.empresasAtivas.length === 0 ? (
          <Text style={{ color: theme.colors.textMuted }}>Nenhuma empresa ativa no momento.</Text>
        ) : (
          data.empresasAtivas.map((empresa) => (
            <Pressable
              key={empresa.id}
              onPress={() =>
                navigation.navigate("Empresa", {
                  companyId: empresa.id,
                  companyNome: empresa.nomeFantasia,
                })
              }
            >
              <VehicleCard>
                <View style={styles.linhaEmpresa}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: theme.colors.text, fontWeight: "600" }} numberOfLines={1}>
                      {empresa.nomeFantasia}
                    </Text>
                    <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>
                      Ativa desde {new Date(empresa.ativaDesde).toLocaleDateString("pt-BR")}
                    </Text>
                  </View>
                  <View style={styles.badges}>
                    <StatusPill label={empresa.planoNome} tone="neutral" />
                    <StatusPill
                      label={empresa.asaasSubscriptionId ? "Assinatura ativa" : "Sem recorrência"}
                      tone={empresa.asaasSubscriptionId ? "info" : "warning"}
                    />
                  </View>
                </View>
              </VehicleCard>
            </Pressable>
          ))
        )}
      </View>

      <VehicleButton
        label="Gerar cobrança Pix"
        variant="secondary"
        onPress={() => navigation.navigate("CobrancaPix")}
      />
      {podeTransferir ? (
        <VehicleButton
          label="Nova transferência Pix"
          variant="secondary"
          onPress={() => navigation.navigate("Transferencia")}
        />
      ) : null}
    </VehicleScreen>
  );
}

const styles = StyleSheet.create({
  badges: { alignItems: "flex-end", gap: 4 },
  center: { alignItems: "center", flex: 1, justifyContent: "center" },
  linhaEmpresa: { alignItems: "center", flexDirection: "row", gap: 8 },
  linhaMuted: { flexDirection: "row", justifyContent: "space-between" },
  saldo: { fontSize: 32, fontWeight: "700" },
  secao: { gap: 8 },
  tituloSecao: { fontSize: 14, fontWeight: "700" },
});

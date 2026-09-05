import { useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { BalanceTrendChart } from "../components";
import { useAdminBillingStatement } from "../hooks/use-admin-billing";
import { isTaxaLancamento, tipoLancamentoLabel } from "../labels";

import type { BillingAdminStatementItem } from "@rotta/api-client";

import {
  StatusPill,
  VehicleButton,
  VehicleCard,
  VehicleScreen,
} from "@/features/vehicles/components";
import { useTheme } from "@/providers/theme-provider";

function centsToBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function LinhaExtrato({ item }: { item: BillingAdminStatementItem }): JSX.Element {
  const { theme } = useTheme();
  const taxa = isTaxaLancamento(item.tipo);
  const entrada = item.valorCentavos >= 0;

  return (
    <VehicleCard>
      <View style={styles.linha}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: theme.colors.text, fontWeight: "600" }} numberOfLines={1}>
            {item.descricao ?? tipoLancamentoLabel(item.tipo)}
          </Text>
          <View style={styles.subLinha}>
            <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>
              {new Date(item.data).toLocaleString("pt-BR")}
            </Text>
            {taxa ? <StatusPill label={tipoLancamentoLabel(item.tipo)} tone="warning" /> : null}
          </View>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text
            style={{
              color: entrada ? theme.colors.success : theme.colors.danger,
              fontWeight: "700",
            }}
          >
            {entrada ? "+" : "−"}
            {centsToBRL(Math.abs(item.valorCentavos))}
          </Text>
          <Text style={{ color: theme.colors.textMuted, fontSize: 11 }}>
            saldo {centsToBRL(item.saldoAposCentavos)}
          </Text>
        </View>
      </View>
    </VehicleCard>
  );
}

/**
 * Extrato da conta Asaas da Rotta no app (pedido do usuário 05/09/2026)
 * — mesma paginação de `ExtratoTable` (apps/admin), acumulando páginas
 * localmente ("Carregar mais") em vez de um seletor de página (melhor
 * pro toque/rolagem do celular do que uma paginação numerada). A linha
 * de tendência do saldo usa só os itens já carregados — ponto real de
 * cada lançamento (`saldoAposCentavos`), nunca uma série inventada.
 */
export function AdminFinanceiroExtratoScreen(): JSX.Element {
  const { theme } = useTheme();
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;
  const { data, isLoading, isError, isFetching } = useAdminBillingStatement(page, PAGE_SIZE);
  const [acumulado, setAcumulado] = useState<BillingAdminStatementItem[]>([]);

  const items = useMemo(() => {
    if (page === 1) return data?.items ?? [];
    return [...acumulado, ...(data?.items ?? [])];
  }, [acumulado, data, page]);

  const pontosSaldo = useMemo(
    () =>
      [...items]
        .sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime())
        .map((item) => ({
          value: item.saldoAposCentavos / 100,
          label: new Date(item.data).toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
          }),
        })),
    [items],
  );

  function handleCarregarMais(): void {
    setAcumulado(items);
    setPage((atual) => atual + 1);
  }

  if (isLoading && page === 1) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  if (isError || !data?.configured) {
    return (
      <VehicleScreen>
        <Text style={{ color: theme.colors.danger }}>
          Não foi possível carregar o extrato da conta Asaas.
        </Text>
      </VehicleScreen>
    );
  }

  if (items.length === 0) {
    return (
      <VehicleScreen>
        <Text style={{ color: theme.colors.textMuted }}>Ainda não há lançamentos nesta conta.</Text>
      </VehicleScreen>
    );
  }

  return (
    <VehicleScreen>
      {pontosSaldo.length >= 2 ? (
        <VehicleCard>
          <Text style={{ color: theme.colors.textMuted, fontSize: 12, fontWeight: "600" }}>
            Tendência do saldo
          </Text>
          <BalanceTrendChart points={pontosSaldo} />
        </VehicleCard>
      ) : null}

      {items.map((item, index) => (
        <LinhaExtrato
          key={`${item.data}-${item.tipo}-${item.valorCentavos}-${index}`}
          item={item}
        />
      ))}

      {data.total > items.length ? (
        <VehicleButton
          label="Carregar mais"
          variant="secondary"
          isLoading={isFetching}
          onPress={handleCarregarMais}
        />
      ) : null}
    </VehicleScreen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center", flex: 1, justifyContent: "center" },
  linha: { flexDirection: "row", gap: 8 },
  subLinha: { alignItems: "center", flexDirection: "row", gap: 6 },
});

import { Receipt } from "@rotta/icons/native";
import { EmptyState, MovementRow, SectionHeader } from "@rotta/ui/native";
import { formatarCentavos } from "@rotta/utils";
import { useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { BalanceTrendChart } from "../components";
import { useAdminBillingStatement } from "../hooks/use-admin-billing";
import { isTaxaLancamento, tipoLancamentoLabel } from "../labels";

import type { BillingAdminStatementItem } from "@rotta/api-client";
import type { Theme } from "@rotta/theme";

import { Texto } from "@/components/texto";
import { VehicleButton, VehicleCard, VehicleScreen } from "@/features/vehicles/components";
import { useTheme } from "@/providers/theme-provider";

function comoDia(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR");
}

function comoHora(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

/**
 * Uma linha do extrato da conta Asaas.
 *
 * O saldo após o lançamento fica no subtítulo, junto da hora: num dia
 * com seis lançamentos, a hora é o que distingue um do outro, e o saldo
 * acumulado é o que explica o número grande. Os dois juntos em texto
 * pequeno valem mais que qualquer um deles em destaque.
 */
function LinhaExtrato({
  item,
  theme,
}: {
  item: BillingAdminStatementItem;
  theme: Theme;
}): JSX.Element {
  const taxa = isTaxaLancamento(item.tipo);
  const rotuloDoTipo = tipoLancamentoLabel(item.tipo);
  const titulo = item.descricao ?? rotuloDoTipo;
  /* Quando a descrição já virou título, o tipo ainda precisa aparecer
     em algum lugar: era o que a etiqueta amarela fazia nas taxas. */
  const prefixo = taxa && item.descricao ? `${rotuloDoTipo} · ` : "";

  return (
    <MovementRow
      titulo={titulo}
      subtitulo={`${prefixo}${comoHora(item.data)} · saldo ${formatarCentavos(item.saldoAposCentavos)}`}
      valorFormatado={formatarCentavos(Math.abs(item.valorCentavos))}
      direcao={item.valorCentavos >= 0 ? "entrada" : "saida"}
      data={comoDia(item.data)}
      theme={theme}
    />
  );
}

/**
 * Extrato da conta Asaas da Rotta no app (pedido do usuário 05/09/2026)
 * — mesma paginação de `ExtratoTable` (apps/admin), acumulando páginas
 * localmente ("Carregar mais") em vez de um seletor de página (melhor
 * pro toque/rolagem do celular do que uma paginação numerada). A linha
 * de tendência do saldo usa só os itens já carregados — ponto real de
 * cada lançamento (`saldoAposCentavos`), nunca uma série inventada.
 *
 * ## O que mudou em 16/10/2026
 *
 * Passou a usar `MovementRow`, `SectionHeader` e `EmptyState`, a mesma
 * linguagem da carteira do transportador. Três consertos vieram junto:
 *
 * **Saída deixou de ser vermelha.** Toda taxa do Asaas e toda
 * transferência aparecia em vermelho, o que fazia um extrato saudável
 * parecer uma sequência de erros. O sinal continua no texto, que é o
 * que sobra para quem não distingue verde de vermelho.
 *
 * **Um cartão por lançamento virou uma lista.** Cada linha era um
 * `VehicleCard` com borda e sombra próprias: vinte lançamentos davam
 * vinte caixas, e o olho perdia a coluna de valores, que é exatamente o
 * que um extrato não pode fazer.
 *
 * **Extrato vazio virou estado vazio**, com a explicação de por que
 * pode estar vazio, em vez de uma frase encostada na borda da tela.
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
        <Texto style={{ color: theme.colors.danger }}>
          Não foi possível carregar o extrato da conta Asaas.
        </Texto>
      </VehicleScreen>
    );
  }

  if (items.length === 0) {
    return (
      <VehicleScreen>
        <EmptyState
          title="Ainda não há lançamentos"
          description="Mensalidades recebidas, taxas do Asaas e transferências aparecem aqui, da mais recente para a mais antiga."
          icon={<Receipt size={28} color={theme.colors.textMuted} />}
          theme={theme}
        />
      </VehicleScreen>
    );
  }

  return (
    <VehicleScreen>
      {pontosSaldo.length >= 2 ? (
        <VehicleCard>
          <SectionHeader title="Tendência do saldo" theme={theme} />
          <BalanceTrendChart points={pontosSaldo} />
        </VehicleCard>
      ) : null}

      <View>
        <SectionHeader title="Lançamentos" theme={theme} />
        <VehicleCard>
          {items.map((item, index) => (
            <LinhaExtrato
              key={`${item.data}-${item.tipo}-${item.valorCentavos}-${index}`}
              item={item}
              theme={theme}
            />
          ))}
        </VehicleCard>
      </View>

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
});

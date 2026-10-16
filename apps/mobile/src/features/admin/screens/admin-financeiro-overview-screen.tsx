import { useAuth } from "@rotta/auth/native";
import { Building2, Eye, EyeOff, QrCode, Receipt, Send } from "@rotta/icons/native";
import {
  ActionGrid,
  BalanceCard,
  EmptyState,
  PersonRow,
  SectionHeader,
  SummaryCards,
} from "@rotta/ui/native";
import { useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { BarBreakdownChart } from "../components";
import { useAdminBillingBalance, useAdminBillingOverview } from "../hooks/use-admin-billing";

import type { AdminFinanceiroStackParamList } from "@/navigation/types";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { Texto } from "@/components/texto";
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
 *
 * ## O que mudou em 16/10/2026
 *
 * Esta tela passou a falar a mesma linguagem visual da carteira do
 * transportador e dos Pagamentos do responsável: `BalanceCard`,
 * `SummaryCards`, `ActionGrid`, `PersonRow`, `SectionHeader` e
 * `EmptyState`, do `@rotta/ui/native`. Antes era a única área de
 * dinheiro desenhada à mão, com `Pressable` cru no lugar de linha e
 * frase solta no lugar de estado vazio.
 *
 * Três consertos de verdade vieram junto:
 *
 * **O saldo da conta da Rotta pode ser escondido.** É o saldo da
 * empresa inteira, e o Admin abre isto em mesa de café e em reunião
 * com terceiro na tela.
 *
 * **Saldo que a API não devolveu deixou de ser um "-" gigante.** Sem
 * `ASAAS_API_KEY`, ou com a consulta falhando, a tela agora diz que o
 * saldo não pôde ser consultado, em vez de desenhar um traço de 32
 * pontos que parece valor zerado.
 *
 * **Os três botões empilhados viraram grade.** "Ver extrato", "Gerar
 * cobrança Pix" e "Nova transferência" eram três barras largas no pé
 * da tela, a de transferência logo abaixo da de cobrança, com a mesma
 * cor e a mesma forma: dinheiro saindo e dinheiro entrando a um polegar
 * de distância. Na grade cada ação tem ícone próprio.
 */
export function AdminFinanceiroOverviewScreen({ navigation }: Props): JSX.Element {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { data, isLoading, isError, refetch } = useAdminBillingOverview();
  const { data: balance } = useAdminBillingBalance();
  /* Estado de sessão, e não preferência guardada: esconder o saldo é
     decisão do momento ("tem gente vendo minha tela agora"). */
  const [saldoVisivel, setSaldoVisivel] = useState(true);
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
        <Texto style={{ color: theme.colors.danger }}>
          Não foi possível carregar o painel financeiro.
        </Texto>
        <VehicleButton label="Tentar novamente" onPress={() => void refetch()} />
      </VehicleScreen>
    );
  }

  const saldoCentavos = balance?.saldoCentavos ?? null;

  return (
    <VehicleScreen>
      {!data.asaas.configured ? (
        <VehicleCard>
          <StatusPill label="Asaas não configurada" tone="warning" />
          <Texto style={{ color: theme.colors.textMuted, fontSize: 12 }}>
            Sem ASAAS_API_KEY, valores de Pix/cartão/boleto não podem ser consultados. Empresas e
            planos abaixo continuam corretos (vêm do banco da Rotta).
          </Texto>
        </VehicleCard>
      ) : null}

      {/*
        Saldo desconhecido não vira número: `FORMULAS.md` manda dado que
        falta aparecer como falta. Um "R$ 0,00" aqui faria o Admin achar
        que a conta zerou.
      */}
      {saldoCentavos === null ? (
        <VehicleCard>
          <Texto style={{ color: theme.colors.textMuted, fontSize: 12 }}>Saldo atual (Asaas)</Texto>
          <Texto style={{ color: theme.colors.text, fontWeight: "600" }}>
            Não foi possível consultar o saldo agora.
          </Texto>
        </VehicleCard>
      ) : (
        <BalanceCard
          label="Saldo atual (Asaas)"
          valorFormatado={centsToBRL(saldoCentavos)}
          visivel={saldoVisivel}
          onAlternarVisibilidade={() => setSaldoVisivel((v) => !v)}
          iconeVisivel={<Eye size={18} color={theme.colors.onPrimary} />}
          iconeOculto={<EyeOff size={18} color={theme.colors.onPrimary} />}
          theme={theme}
        />
      )}

      <ActionGrid
        items={[
          {
            key: "extrato",
            label: "Extrato",
            icon: <Receipt size={20} color={theme.colors.primary} />,
            onPress: () => navigation.navigate("Extrato"),
          },
          {
            key: "cobranca",
            label: "Cobrar Pix",
            icon: <QrCode size={20} color={theme.colors.primary} />,
            onPress: () => navigation.navigate("CobrancaPix"),
          },
          {
            key: "transferencia",
            label: "Transferir",
            icon: <Send size={20} color={theme.colors.primary} />,
            onPress: () => navigation.navigate("Transferencia"),
            /* O backend (`AdminAreaGuard`) é quem barra de verdade;
               aqui o atalho fica apagado com o motivo à mostra, em vez
               de desaparecer e deixar o papel Financeiro procurando. */
            motivoIndisponivel: podeTransferir ? undefined : "restrito ao papel Geral",
          },
        ]}
        theme={theme}
      />

      <VehicleCard>
        <SectionHeader title="Mensalidade da plataforma hoje" theme={theme} />
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
        <SummaryCards
          items={[
            {
              key: "pagas",
              label: "Pagas hoje",
              valor: data.quantidadeCobrancasPagas ?? null,
              tone: "success",
            },
            {
              key: "empresas",
              label: "Empresas",
              valor: data.quantidadeEmpresasAtivas,
              detalhe: "ativas",
              tone: "info",
            },
          ]}
          theme={theme}
        />
      </VehicleCard>

      {data.planos.length > 0 ? (
        <VehicleCard>
          <SectionHeader title="Planos em uso" theme={theme} />
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
        <SectionHeader title="Empresas usando o plano" theme={theme} />
        {data.empresasAtivas.length === 0 ? (
          <EmptyState
            title="Nenhuma empresa ativa"
            description="Transportadoras com plano ativo aparecem aqui, com o histórico de pagamento de cada uma."
            icon={<Building2 size={28} color={theme.colors.textMuted} />}
            theme={theme}
          />
        ) : (
          <VehicleCard>
            {data.empresasAtivas.map((empresa) => (
              <PersonRow
                key={empresa.id}
                nome={empresa.nomeFantasia}
                subtitulo={`${empresa.planoNome} · ativa desde ${new Date(
                  empresa.ativaDesde,
                ).toLocaleDateString("pt-BR")}`}
                status={{
                  label: empresa.asaasSubscriptionId ? "Assinatura ativa" : "Sem recorrência",
                  tone: empresa.asaasSubscriptionId ? "info" : "warning",
                }}
                onPress={() =>
                  navigation.navigate("Empresa", {
                    companyId: empresa.id,
                    companyNome: empresa.nomeFantasia,
                  })
                }
                theme={theme}
              />
            ))}
          </VehicleCard>
        )}
      </View>
    </VehicleScreen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center", flex: 1, justifyContent: "center" },
  secao: { gap: 8 },
});

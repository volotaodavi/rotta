import { useAuth } from "@rotta/auth/native";
import { Bus, GraduationCap, ShoppingBag, Users } from "@rotta/icons/native";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { TrialBanner } from "../components";
import { useMyCompany } from "../hooks/use-empresa-company";
import { useStudentsTotal } from "../hooks/use-empresa-dashboard";
import { useTransportRequestsList } from "../hooks/use-empresa-marketplace";
import { useRoutesList } from "../hooks/use-empresa-routes";
import { useMyTeam, usePendingJoinRequests } from "../hooks/use-empresa-team";
import { useVehiclesList } from "../hooks/use-empresa-vehicles";

import type { EmpresaHomeStackParamList, EmpresaTabParamList } from "@/navigation/types";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { ComponentType } from "react";

import { ROUTE_STATUS_LABEL, ROUTE_STATUS_TONE } from "@/features/routes/labels";
import { SCHOOL_SHIFT_LABEL } from "@/features/schools/labels";
import {
  StatusPill,
  VehicleButton,
  VehicleCard,
  VehicleScreen,
} from "@/features/vehicles/components";
import { useTheme } from "@/providers/theme-provider";

type Props = NativeStackScreenProps<EmpresaHomeStackParamList, "Dashboard">;

/**
 * Início da área Empresa/Gestor reduzida no app (pedido do usuário
 * 11/09/2026: "veja oq tem na web e traga para o app oficial" — versão
 * reduzida confirmada). Atalhos pra "Alunos" (Frente 2) e "Equipe"
 * (Frente 5, aninhada na mesma aba — ver `EmpresaTabParamList`); o de
 * Equipe mostra a contagem de pedidos pendentes, mesmo dado do
 * `tabBarBadge` da aba Início (`EmpresaNavigator`).
 *
 * "Solicitações"/"Contratos" (Frente A, 12/09/2026 — pedido do usuário:
 * "o app é o principal... traga o que tem na Web pro app") — antes
 * desta Frente o app não tinha NENHUMA tela de Marketplace; uma
 * solicitação de família só era vista abrindo a Web. O atalho de
 * Solicitações mostra a contagem de `RECEBIDA` (ainda sem decisão),
 * mesmo raciocínio do badge de Equipe.
 *
 * Resumo (Veículos/Alunos/Motoristas) + "Rotas ativas" (redesign
 * 15/09/2026 — pedido do usuário: print real da Rotta anexado mostra
 * um resumo de 3 números + lista de rotas em andamento na Home do
 * Gestor, que esta tela não tinha; "faça oq deve estar no app"). Só
 * "Motoristas" conta (não Monitores/Gestores) — mesmo recorte do print.
 * "Rotas ativas" usa `RouteStatus === "ATIVA"` (não um estado de
 * viagem-agora-em-curso: isso exigiria consultar a viagem de hoje de
 * cada rota uma por uma, N+1 que nem a própria Web faz na listagem de
 * rotas) — nunca um número inventado. Toca numa rota leva pra aba
 * Rotas (não pro detalhe direto: `EmpresaTabParamList.Rotas` ainda não
 * tipa parâmetros aninhados, mudança maior de escopo pra outro dia).
 */
export function EmpresaHomeScreen({ navigation }: Props): JSX.Element {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { data: company } = useMyCompany(user?.companyId);
  const { data: pendentes } = usePendingJoinRequests();
  // Só o total importa aqui (badge do atalho) — `pageSize: 1` evita
  // carregar a lista inteira só pra saber a contagem.
  const { data: solicitacoesRecebidas } = useTransportRequestsList({
    status: "RECEBIDA",
    pageSize: 1,
  });

  const { data: veiculos } = useVehiclesList({ pageSize: 1 });
  const { data: alunosTotal } = useStudentsTotal();
  const { data: equipe } = useMyTeam();
  const motoristasCount = equipe?.filter((membro) => membro.papel === "motorista").length;
  const { data: rotasAtivas } = useRoutesList({ status: "ATIVA", pageSize: 5 });

  function irParaAba(aba: keyof EmpresaTabParamList): void {
    navigation.getParent<BottomTabNavigationProp<EmpresaTabParamList>>()?.navigate(aba);
  }

  return (
    <VehicleScreen>
      <View>
        <Text style={[styles.saudacao, { color: theme.colors.text }]}>Olá, {user?.nome}</Text>
        {user?.companyName ? (
          <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>{user.companyName}</Text>
        ) : null}
      </View>

      {company ? <TrialBanner company={company} /> : null}

      <View style={styles.statsRow}>
        <StatTile
          icon={Bus}
          valor={veiculos?.total}
          label="Veículos"
          onPress={() => irParaAba("Frota")}
        />
        <StatTile
          icon={GraduationCap}
          valor={alunosTotal}
          label="Alunos"
          onPress={() => navigation.navigate("AlunosPreCadastro")}
        />
        <StatTile
          icon={Users}
          valor={motoristasCount}
          label="Motoristas"
          onPress={() => navigation.navigate("Equipe")}
        />
      </View>

      {rotasAtivas && rotasAtivas.items.length > 0 ? (
        <View style={styles.rotasSection}>
          <View style={styles.rotasHeader}>
            <Text style={[styles.secao, { color: theme.colors.text }]}>Rotas ativas</Text>
            <Pressable onPress={() => irParaAba("Rotas")} accessibilityRole="button">
              <Text style={{ color: theme.colors.primary, fontSize: 13, fontWeight: "600" }}>
                Ver todas
              </Text>
            </Pressable>
          </View>
          {rotasAtivas.items.map((rota) => (
            <Pressable key={rota.id} onPress={() => irParaAba("Rotas")}>
              <VehicleCard style={styles.rotaCard}>
                <Text style={{ color: theme.colors.text, fontWeight: "600" }} numberOfLines={1}>
                  {rota.nome}
                </Text>
                <View style={styles.rotaCardFooter}>
                  <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>
                    {SCHOOL_SHIFT_LABEL[rota.turno]}
                  </Text>
                  <StatusPill
                    label={ROUTE_STATUS_LABEL[rota.status]}
                    tone={ROUTE_STATUS_TONE[rota.status]}
                  />
                </View>
              </VehicleCard>
            </Pressable>
          ))}
        </View>
      ) : null}

      <VehicleButton
        label={
          solicitacoesRecebidas && solicitacoesRecebidas.total > 0
            ? `Solicitações (${solicitacoesRecebidas.total} novas)`
            : "Solicitações de transporte"
        }
        variant="secondary"
        icon={<ShoppingBag size={18} color={theme.colors.text} />}
        onPress={() => navigation.navigate("MarketplaceSolicitacoes")}
      />
      <VehicleButton
        label="Contratos"
        variant="secondary"
        icon={<ShoppingBag size={18} color={theme.colors.text} />}
        onPress={() => navigation.navigate("MarketplaceContratos")}
      />
      <VehicleButton
        label={
          pendentes && pendentes.length > 0 ? `Equipe (${pendentes.length} pendentes)` : "Equipe"
        }
        variant="secondary"
        icon={<Users size={18} color={theme.colors.text} />}
        onPress={() => navigation.navigate("Equipe")}
      />
    </VehicleScreen>
  );
}

/**
 * Um número do resumo (Veículos/Alunos/Motoristas) — `valor` `undefined`
 * enquanto carrega mostra "—", nunca um placeholder de número inventado.
 */
function StatTile({
  icon: Icon,
  valor,
  label,
  onPress,
}: {
  icon: ComponentType<{ size?: number; color?: string }>;
  valor: number | undefined;
  label: string;
  onPress: () => void;
}): JSX.Element {
  const { theme } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={[
        styles.statTile,
        {
          backgroundColor: theme.colors.surfaceElevated,
          borderColor: theme.colors.border,
          borderRadius: theme.radius.lg,
        },
      ]}
    >
      <Icon size={18} color={theme.colors.primary} />
      <Text style={[styles.statValor, { color: theme.colors.text }]}>{valor ?? "—"}</Text>
      <Text style={{ color: theme.colors.textMuted, fontSize: 11 }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  rotaCard: { gap: 6 },
  rotaCardFooter: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  rotasHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  rotasSection: { gap: 8 },
  saudacao: { fontSize: 18, fontWeight: "700" },
  secao: { fontSize: 15, fontWeight: "700" },
  statTile: { alignItems: "center", borderWidth: 1, flex: 1, gap: 4, paddingVertical: 14 },
  statValor: { fontSize: 20, fontWeight: "700" },
  statsRow: { flexDirection: "row", gap: 8 },
});

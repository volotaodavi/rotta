import { useAuth } from "@rotta/auth/native";
import { GraduationCap, ShoppingBag, Users } from "@rotta/icons/native";
import { StyleSheet, Text, View } from "react-native";

import { useTransportRequestsList } from "../hooks/use-empresa-marketplace";
import { usePendingJoinRequests } from "../hooks/use-empresa-team";

import type { EmpresaHomeStackParamList } from "@/navigation/types";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { VehicleButton, VehicleScreen } from "@/features/vehicles/components";
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
 */
export function EmpresaHomeScreen({ navigation }: Props): JSX.Element {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { data: pendentes } = usePendingJoinRequests();
  // Só o total importa aqui (badge do atalho) — `pageSize: 1` evita
  // carregar a lista inteira só pra saber a contagem.
  const { data: solicitacoesRecebidas } = useTransportRequestsList({
    status: "RECEBIDA",
    pageSize: 1,
  });

  return (
    <VehicleScreen>
      <View>
        <Text style={[styles.saudacao, { color: theme.colors.text }]}>Olá, {user?.nome}</Text>
        {user?.companyName ? (
          <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>{user.companyName}</Text>
        ) : null}
      </View>
      <Text style={{ color: theme.colors.textMuted }}>
        Acompanhe sua frota e suas rotas por aqui. Mais áreas de gestão chegam em breve.
      </Text>

      <VehicleButton
        label="Alunos"
        variant="secondary"
        icon={<GraduationCap size={18} color={theme.colors.text} />}
        onPress={() => navigation.navigate("AlunosPreCadastro")}
      />
      <VehicleButton
        label={
          pendentes && pendentes.length > 0 ? `Equipe (${pendentes.length} pendentes)` : "Equipe"
        }
        variant="secondary"
        icon={<Users size={18} color={theme.colors.text} />}
        onPress={() => navigation.navigate("Equipe")}
      />
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
    </VehicleScreen>
  );
}

const styles = StyleSheet.create({
  saudacao: { fontSize: 18, fontWeight: "700" },
});

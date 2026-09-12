import { useAuth } from "@rotta/auth/native";
import { GraduationCap, Users } from "@rotta/icons/native";
import { StyleSheet, Text, View } from "react-native";

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
 */
export function EmpresaHomeScreen({ navigation }: Props): JSX.Element {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { data: pendentes } = usePendingJoinRequests();

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
    </VehicleScreen>
  );
}

const styles = StyleSheet.create({
  saudacao: { fontSize: 18, fontWeight: "700" },
});

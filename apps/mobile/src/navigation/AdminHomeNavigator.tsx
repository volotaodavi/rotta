import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { opcoesDoCabecalho } from "./estilo-da-navegacao";

import type { AdminHomeStackParamList } from "./types";

import { AdminApprovalsScreen, AdminHomeScreen } from "@/features/admin/screens";
import { useTheme } from "@/providers/theme-provider";

const Stack = createNativeStackNavigator<AdminHomeStackParamList>();

/**
 * Stack da aba "Início" do Admin Rotta (pedido do usuário 05/09/2026) —
 * `Dashboard` (KPIs) e `Aprovacoes` (fila), mesmo papel de aninhamento
 * de `AdminSupportNavigator`/demais stacks do app: a aba em si nunca
 * muda, só a tela exibida dentro dela.
 */
export function AdminHomeNavigator(): JSX.Element {
  const { theme } = useTheme();
  return (
    <Stack.Navigator screenOptions={{ ...opcoesDoCabecalho(theme), headerTitleAlign: "center" }}>
      <Stack.Screen name="Dashboard" component={AdminHomeScreen} options={{ title: "Início" }} />
      <Stack.Screen
        name="Aprovacoes"
        component={AdminApprovalsScreen}
        options={{ title: "Aprovações" }}
      />
    </Stack.Navigator>
  );
}

import { createNativeStackNavigator } from "@react-navigation/native-stack";

import type { AdminHomeStackParamList } from "./types";

import { AdminApprovalsScreen, AdminHomeScreen } from "@/features/admin/screens";


const Stack = createNativeStackNavigator<AdminHomeStackParamList>();

/**
 * Stack da aba "Início" do Admin Rotta (pedido do usuário 05/09/2026) —
 * `Dashboard` (KPIs) e `Aprovacoes` (fila), mesmo papel de aninhamento
 * de `AdminSupportNavigator`/demais stacks do app: a aba em si nunca
 * muda, só a tela exibida dentro dela.
 */
export function AdminHomeNavigator(): JSX.Element {
  return (
    <Stack.Navigator screenOptions={{ headerTitleAlign: "center" }}>
      <Stack.Screen name="Dashboard" component={AdminHomeScreen} options={{ title: "Início" }} />
      <Stack.Screen
        name="Aprovacoes"
        component={AdminApprovalsScreen}
        options={{ title: "Aprovações" }}
      />
    </Stack.Navigator>
  );
}

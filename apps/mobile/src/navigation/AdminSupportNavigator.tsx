import { createNativeStackNavigator } from "@react-navigation/native-stack";

import type { AdminSupportStackParamList } from "./types";

import { AdminChamadosScreen } from "@/features/admin/screens";
import { ChamadoDetalhesScreen } from "@/features/support/screens";


const Stack = createNativeStackNavigator<AdminSupportStackParamList>();

/**
 * Stack de Suporte do Admin Rotta (pedido do usuário 05/09/2026) —
 * `Lista` é nova (`AdminChamadosScreen`, sem "Novo chamado" e mostrando
 * a empresa de cada chamado); `Detalhes` reaproveita literalmente
 * `ChamadoDetalhesScreen` (mesma tela usada por Responsável/Motorista/
 * Monitor) — o chat já distingue `autorIsAdminRotta` e o backend já
 * resolve o escopo cross-tenant pelo ator autenticado.
 */
export function AdminSupportNavigator(): JSX.Element {
  return (
    <Stack.Navigator screenOptions={{ headerTitleAlign: "center" }}>
      <Stack.Screen name="Lista" component={AdminChamadosScreen} options={{ title: "Chamados" }} />
      <Stack.Screen
        name="Detalhes"
        component={ChamadoDetalhesScreen}
        options={{ title: "Chamado" }}
      />
    </Stack.Navigator>
  );
}

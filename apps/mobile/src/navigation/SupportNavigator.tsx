import { createNativeStackNavigator } from "@react-navigation/native-stack";

import {
  ChamadoDetalhesScreen,
  ChamadosScreen,
  NovoChamadoScreen,
} from "@/features/support/screens";

import type { SupportStackParamList } from "./types";


const Stack = createNativeStackNavigator<SupportStackParamList>();

/**
 * Stack de Suporte (Epic B) — montada dentro da aba "Perfil" de
 * qualquer papel (`ParentPerfilNavigator`/`DriverPerfilNavigator`),
 * mesmo papel de `VeiculoNavigator` dentro de `DriverPerfilNavigator`.
 * Não existia NENHUMA tela de suporte no app nativo antes desta
 * entrega — espelha 1:1 as 3 rotas do Painel Web (`/chamados`,
 * `/chamados/novo`, `/chamados/:id`).
 */
export function SupportNavigator(): JSX.Element {
  return (
    <Stack.Navigator screenOptions={{ headerTitleAlign: "center" }}>
      <Stack.Screen name="Lista" component={ChamadosScreen} options={{ title: "Chamados" }} />
      <Stack.Screen name="Novo" component={NovoChamadoScreen} options={{ title: "Novo chamado" }} />
      <Stack.Screen
        name="Detalhes"
        component={ChamadoDetalhesScreen}
        options={{ title: "Chamado" }}
      />
    </Stack.Navigator>
  );
}

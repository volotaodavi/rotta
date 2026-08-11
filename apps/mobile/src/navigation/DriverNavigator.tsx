import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";

import { DriverPerfilNavigator } from "./DriverPerfilNavigator";
import { VeiculoNavigator } from "./VeiculoNavigator";

import type { DriverTabParamList } from "./types";

import { DriverHistoricoScreen, DriverInicioScreen } from "@/features/driver/screens";

const Tab = createBottomTabNavigator<DriverTabParamList>();

/**
 * Navegação do Motorista/Monitor (Dossie 10, Secao 11.1) — Bottom
 * Navigation com no máximo 3-4 itens, conforme especificado. "Início"/
 * "Histórico"/"Perfil" eram placeholders "em construção" desde a
 * fundação do app — fechados no Prompt Mestre da Rotta (Seções 7/8/9):
 * o backend (`TripsModule`/`RoutesModule`) já existia e já era testado,
 * faltava só a tela. "Veículo" já era real (Dossiê 23, tarefa #59).
 */
export function DriverNavigator(): JSX.Element {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Inicio" component={DriverInicioScreen} options={{ title: "Início" }} />
      <Tab.Screen
        name="Historico"
        component={DriverHistoricoScreen}
        options={{ title: "Histórico" }}
      />
      <Tab.Screen name="Veiculo" component={VeiculoNavigator} options={{ title: "Veículo" }} />
      <Tab.Screen name="Perfil" component={DriverPerfilNavigator} options={{ title: "Perfil" }} />
    </Tab.Navigator>
  );
}

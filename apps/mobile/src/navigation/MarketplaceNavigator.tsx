import { createNativeStackNavigator } from "@react-navigation/native-stack";

import type { MarketplaceStackParamList } from "./types";

import {
  MapaScreen,
  SolicitarTransporteScreen,
  TransportadorDetalhesScreen,
} from "@/features/marketplace/screens";

const Stack = createNativeStackNavigator<MarketplaceStackParamList>();

/**
 * Stack da aba "Mapa" do Responsável (briefing "Marketplace") — busca de
 * transportadores próximos (`MapaHome`), detalhes de um transportador e
 * solicitação de transporte. Montada como a tela da aba `Mapa` em
 * `ParentNavigator`, mesmo papel de `VeiculoNavigator` em `DriverNavigator`.
 */
export function MarketplaceNavigator(): JSX.Element {
  return (
    <Stack.Navigator screenOptions={{ headerTitleAlign: "center" }}>
      <Stack.Screen name="MapaHome" component={MapaScreen} options={{ title: "Transportadores" }} />
      <Stack.Screen
        name="TransportadorDetalhes"
        component={TransportadorDetalhesScreen}
        options={{ title: "Transportador" }}
      />
      <Stack.Screen
        name="SolicitarTransporte"
        component={SolicitarTransporteScreen}
        options={{ title: "Solicitar Transporte" }}
      />
    </Stack.Navigator>
  );
}

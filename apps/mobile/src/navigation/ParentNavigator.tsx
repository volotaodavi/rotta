import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { StyleSheet, Text, View } from "react-native";

import { MarketplaceNavigator } from "./MarketplaceNavigator";

import type { ParentTabParamList } from "./types";

import { useResponsavelTransportState } from "@/features/marketplace/hooks/use-transport-state";
import { TRANSPORT_TAB_LABEL } from "@/features/marketplace/labels";
import { TransporteInicioScreen } from "@/features/marketplace/screens";

const Tab = createBottomTabNavigator<ParentTabParamList>();

/**
 * PLACEHOLDER — Notificações/Perfil do Responsável (Dossie 11, Secao 4)
 * a implementar em outra tarefa; fora do escopo do módulo Marketplace.
 */
function PlaceholderScreen({ label }: { label: string }): JSX.Element {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>{label} — em construção</Text>
    </View>
  );
}

/**
 * Navegação do Responsável (Dossie 10, Secao 11.1; briefing
 * "Marketplace" §"NAVEGAÇÃO") — Bottom Navigation: Mapa (tela padrão
 * sempre que o app abre), Transporte (rótulo dinâmico pelos 5 estados
 * do Responsável — `TRANSPORT_TAB_LABEL`), Notificações, Perfil.
 */
export function ParentNavigator(): JSX.Element {
  const { state } = useResponsavelTransportState();

  return (
    <Tab.Navigator initialRouteName="Mapa" screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Mapa" component={MarketplaceNavigator} />
      <Tab.Screen
        name="Transporte"
        component={TransporteInicioScreen}
        options={{ title: TRANSPORT_TAB_LABEL[state], tabBarLabel: TRANSPORT_TAB_LABEL[state] }}
      />
      <Tab.Screen name="Notificacoes">
        {() => <PlaceholderScreen label="Notificações" />}
      </Tab.Screen>
      <Tab.Screen name="Perfil">{() => <PlaceholderScreen label="Perfil" />}</Tab.Screen>
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: "center", flex: 1, justifyContent: "center" },
  text: { fontSize: 16, opacity: 0.6 },
});

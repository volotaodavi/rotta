import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { StyleSheet, Text, View } from "react-native";

import type { DriverTabParamList } from "./types";

const Tab = createBottomTabNavigator<DriverTabParamList>();

/**
 * PLACEHOLDER — telas reais do Motorista (Dossie 11, Secao 3; Dossie 18
 * `GPS-*`/`EMB-*`/`DESEMB-*`) a implementar depois da fundacao.
 */
function PlaceholderScreen({ label }: { label: string }): JSX.Element {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>{label} — em construção</Text>
    </View>
  );
}

/**
 * Navegação do Motorista/Monitor (Dossie 10, Secao 11.1) — Bottom
 * Navigation com no máximo 3-4 itens, conforme especificado.
 */
export function DriverNavigator(): JSX.Element {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Inicio">{() => <PlaceholderScreen label="Início" />}</Tab.Screen>
      <Tab.Screen name="Historico">{() => <PlaceholderScreen label="Histórico" />}</Tab.Screen>
      <Tab.Screen name="Perfil">{() => <PlaceholderScreen label="Perfil" />}</Tab.Screen>
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: "center", flex: 1, justifyContent: "center" },
  text: { fontSize: 16, opacity: 0.6 },
});

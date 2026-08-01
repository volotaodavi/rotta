import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { StyleSheet, Text, View } from "react-native";

import type { ParentTabParamList } from "./types";

const Tab = createBottomTabNavigator<ParentTabParamList>();

/**
 * PLACEHOLDER — telas reais do Responsável (Dossie 11, Secao 4) a
 * implementar depois da fundacao.
 */
function PlaceholderScreen({ label }: { label: string }): JSX.Element {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>{label} — em construção</Text>
    </View>
  );
}

/**
 * Navegação do Responsável (Dossie 10, Secao 11.1) — Bottom Navigation:
 * Início, Histórico, Notificações, Perfil.
 */
export function ParentNavigator(): JSX.Element {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Inicio">{() => <PlaceholderScreen label="Início" />}</Tab.Screen>
      <Tab.Screen name="Historico">{() => <PlaceholderScreen label="Histórico" />}</Tab.Screen>
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

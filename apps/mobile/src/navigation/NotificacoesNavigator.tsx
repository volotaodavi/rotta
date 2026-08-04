import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Pressable, Text } from "react-native";

import type { NotificationsStackParamList } from "./types";

import {
  CentralScreen,
  DetalhesScreen,
  HistoricoScreen,
  PreferenciasScreen,
} from "@/features/notifications/screens";
import { useTheme } from "@/providers/theme-provider";


const Stack = createNativeStackNavigator<NotificationsStackParamList>();

/**
 * Stack da Central de Notificações Internas (Dossiê 11 §4.4) — montada
 * como a tela da aba `Notificacoes` em `ParentNavigator`, mesmo papel de
 * `MarketplaceNavigator`/`VeiculoNavigator` dentro das demais abas.
 */
export function NotificacoesNavigator(): JSX.Element {
  const { theme } = useTheme();

  return (
    <Stack.Navigator screenOptions={{ headerTitleAlign: "center" }}>
      <Stack.Screen
        name="Central"
        component={CentralScreen}
        options={({ navigation }) => ({
          title: "Notificações",
          headerRight: () => (
            <Pressable
              accessibilityRole="button"
              onPress={() => navigation.navigate("Preferencias")}
              hitSlop={8}
            >
              <Text style={{ color: theme.colors.primary, fontWeight: "600" }}>Preferências</Text>
            </Pressable>
          ),
        })}
      />
      <Stack.Screen name="Detalhes" component={DetalhesScreen} options={{ title: "Notificação" }} />
      <Stack.Screen
        name="Historico"
        component={HistoricoScreen}
        options={{ title: "Arquivadas" }}
      />
      <Stack.Screen
        name="Preferencias"
        component={PreferenciasScreen}
        options={{ title: "Preferências" }}
      />
    </Stack.Navigator>
  );
}

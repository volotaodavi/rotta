import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Pressable } from "react-native";

import { opcoesDoCabecalho } from "./estilo-da-navegacao";

import type { NotificationsStackParamList } from "./types";

import { Texto } from "@/components/texto";
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
    <Stack.Navigator screenOptions={{ ...opcoesDoCabecalho(theme), headerTitleAlign: "center" }}>
      <Stack.Screen
        name="Central"
        component={CentralScreen}
        options={({ navigation }) => ({
          /* Título vazio de propósito (referência "NOTIFICAÇÕES -
             RESPONSÁVEL"): o "Notificações" grande em negrito é
             desenhado DENTRO da tela, alinhado à esquerda, não como
             título centralizado de cabeçalho. O cabeçalho continua
             existindo (é ele que garante a margem da barra de status e
             abriga "Preferências"), só sem repetir o mesmo texto. */
          title: "",
          headerRight: () => (
            <Pressable
              accessibilityRole="button"
              onPress={() => navigation.navigate("Preferencias")}
              hitSlop={8}
            >
              <Texto style={{ color: theme.colors.primary, fontWeight: "600" }}>Preferências</Texto>
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

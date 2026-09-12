import { createNativeStackNavigator } from "@react-navigation/native-stack";

import type { EmpresaRotasStackParamList } from "./types";

import { EmpresaRotaDetalheScreen, EmpresaRotasListaScreen } from "@/features/empresa/screens";

const Stack = createNativeStackNavigator<EmpresaRotasStackParamList>();

/**
 * Stack da aba "Rotas" da Empresa/Gestor (Frente 4a — lista e detalhe;
 * `Novo` entra na Frente 4b).
 */
export function EmpresaRotasNavigator(): JSX.Element {
  return (
    <Stack.Navigator screenOptions={{ headerTitleAlign: "center" }}>
      <Stack.Screen name="Lista" component={EmpresaRotasListaScreen} options={{ title: "Rotas" }} />
      <Stack.Screen
        name="Detalhe"
        component={EmpresaRotaDetalheScreen}
        options={{ title: "Rota" }}
      />
    </Stack.Navigator>
  );
}

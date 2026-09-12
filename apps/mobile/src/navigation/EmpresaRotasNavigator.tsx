import { createNativeStackNavigator } from "@react-navigation/native-stack";

import type { EmpresaRotasStackParamList } from "./types";

import {
  EmpresaRotaDetalheScreen,
  EmpresaRotaNovaScreen,
  EmpresaRotasListaScreen,
} from "@/features/empresa/screens";

const Stack = createNativeStackNavigator<EmpresaRotasStackParamList>();

/** Stack da aba "Rotas" da Empresa/Gestor — lista, detalhe e cadastro. */
export function EmpresaRotasNavigator(): JSX.Element {
  return (
    <Stack.Navigator screenOptions={{ headerTitleAlign: "center" }}>
      <Stack.Screen name="Lista" component={EmpresaRotasListaScreen} options={{ title: "Rotas" }} />
      <Stack.Screen
        name="Detalhe"
        component={EmpresaRotaDetalheScreen}
        options={{ title: "Rota" }}
      />
      <Stack.Screen
        name="Novo"
        component={EmpresaRotaNovaScreen}
        options={{ title: "Nova rota" }}
      />
    </Stack.Navigator>
  );
}

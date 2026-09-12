import { createNativeStackNavigator } from "@react-navigation/native-stack";

import type { EmpresaFrotaStackParamList } from "./types";

import { EmpresaFrotaListaScreen, EmpresaVeiculoDetalheScreen } from "@/features/empresa/screens";

const Stack = createNativeStackNavigator<EmpresaFrotaStackParamList>();

/**
 * Stack da aba "Frota" da Empresa/Gestor (Frente 3a — lista e detalhe;
 * `Novo`/`Documentos` entram na Frente 3b, quando essas telas
 * existirem de verdade — mesmo cuidado das demais Frentes desta área).
 */
export function EmpresaFrotaNavigator(): JSX.Element {
  return (
    <Stack.Navigator screenOptions={{ headerTitleAlign: "center" }}>
      <Stack.Screen name="Lista" component={EmpresaFrotaListaScreen} options={{ title: "Frota" }} />
      <Stack.Screen
        name="Detalhe"
        component={EmpresaVeiculoDetalheScreen}
        options={{ title: "Veículo" }}
      />
    </Stack.Navigator>
  );
}

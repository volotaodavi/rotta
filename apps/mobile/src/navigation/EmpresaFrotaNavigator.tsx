import { createNativeStackNavigator } from "@react-navigation/native-stack";

import type { EmpresaFrotaStackParamList } from "./types";

import {
  EmpresaFrotaListaScreen,
  EmpresaVeiculoDetalheScreen,
  EmpresaVeiculoDocumentosScreen,
  EmpresaVeiculoNovoScreen,
} from "@/features/empresa/screens";

const Stack = createNativeStackNavigator<EmpresaFrotaStackParamList>();

/**
 * Stack da aba "Frota" da Empresa/Gestor — lista, detalhe (Frente 3a),
 * cadastro e documentos (Frente 3b).
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
      <Stack.Screen
        name="Novo"
        component={EmpresaVeiculoNovoScreen}
        options={{ title: "Novo veículo" }}
      />
      <Stack.Screen
        name="Documentos"
        component={EmpresaVeiculoDocumentosScreen}
        options={{ title: "Documentos" }}
      />
    </Stack.Navigator>
  );
}

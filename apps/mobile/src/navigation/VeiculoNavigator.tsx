import { createNativeStackNavigator } from "@react-navigation/native-stack";

import type { VeiculoStackParamList } from "./types";

import {
  ChecklistScreen,
  DocumentosScreen,
  FotosScreen,
  HistoricoScreen,
  MeuVeiculoScreen,
  OcorrenciasScreen,
} from "@/features/vehicles/screens";

const Stack = createNativeStackNavigator<VeiculoStackParamList>();

/**
 * Stack de "Meu Veículo" (briefing "APP MOBILE") — telas Fotos/
 * Documentos/Histórico/Ocorrências/Checklist, todas sobre o veículo
 * atualmente vinculado ao Motorista/Monitor autenticado (`GET /vehicles/
 * me`). Montada como a tela da aba `Veiculo` em `DriverNavigator`.
 */
export function VeiculoNavigator(): JSX.Element {
  return (
    <Stack.Navigator screenOptions={{ headerTitleAlign: "center" }}>
      <Stack.Screen
        name="MeuVeiculo"
        component={MeuVeiculoScreen}
        options={{ title: "Meu Veículo" }}
      />
      <Stack.Screen name="Fotos" component={FotosScreen} options={{ title: "Fotos" }} />
      <Stack.Screen
        name="Documentos"
        component={DocumentosScreen}
        options={{ title: "Documentos" }}
      />
      <Stack.Screen name="Historico" component={HistoricoScreen} options={{ title: "Histórico" }} />
      <Stack.Screen
        name="Ocorrencias"
        component={OcorrenciasScreen}
        options={{ title: "Ocorrências" }}
      />
      <Stack.Screen name="Checklist" component={ChecklistScreen} options={{ title: "Checklist" }} />
    </Stack.Navigator>
  );
}

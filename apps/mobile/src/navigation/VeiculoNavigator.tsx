import { createNativeStackNavigator } from "@react-navigation/native-stack";

import type { VeiculoStackParamList } from "./types";

import {
  EscolaDetalhesScreen,
  EscolaHorariosScreen,
  EscolaMapaScreen,
  EscolaRotasVinculadasScreen,
  EscolasScreen,
} from "@/features/schools/screens";
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
 *
 * Também aninha as telas do módulo Escolas (Escolas/Detalhes/Mapa/Rotas
 * vinculadas/Horários) — sem aba própria, já que o Bottom Navigation do
 * Motorista está no limite de 3-4 itens (Dossiê 10 §11.1); acessadas a
 * partir do botão "Escolas atendidas" em `MeuVeiculoScreen`.
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
      <Stack.Screen name="Escolas" component={EscolasScreen} options={{ title: "Escolas" }} />
      <Stack.Screen
        name="EscolaDetalhes"
        component={EscolaDetalhesScreen}
        options={{ title: "Escola" }}
      />
      <Stack.Screen name="EscolaMapa" component={EscolaMapaScreen} options={{ title: "Mapa" }} />
      <Stack.Screen
        name="EscolaRotasVinculadas"
        component={EscolaRotasVinculadasScreen}
        options={{ title: "Rotas vinculadas" }}
      />
      <Stack.Screen
        name="EscolaHorarios"
        component={EscolaHorariosScreen}
        options={{ title: "Horários" }}
      />
    </Stack.Navigator>
  );
}

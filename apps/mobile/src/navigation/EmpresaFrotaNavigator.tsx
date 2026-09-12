import { createNativeStackNavigator } from "@react-navigation/native-stack";

import type { EmpresaFrotaStackParamList } from "./types";

import {
  EmpresaFrotaListaScreen,
  EmpresaFrotaMapaScreen,
  EmpresaVeiculoAuditoriaScreen,
  EmpresaVeiculoChecklistScreen,
  EmpresaVeiculoDetalheScreen,
  EmpresaVeiculoDocumentosScreen,
  EmpresaVeiculoLembretesScreen,
  EmpresaVeiculoManutencoesScreen,
  EmpresaVeiculoNovoScreen,
  EmpresaVeiculoOcorrenciasScreen,
  EmpresaVeiculoVinculosScreen,
} from "@/features/empresa/screens";

const Stack = createNativeStackNavigator<EmpresaFrotaStackParamList>();

/**
 * Stack da aba "Frota" da Empresa/Gestor — lista, detalhe (Frente 3a),
 * cadastro e documentos (Frente 3b), e Mapa (Frente B — localizador em
 * tempo real, antes só existia pra escolas/transportadores).
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
      <Stack.Screen name="Mapa" component={EmpresaFrotaMapaScreen} options={{ title: "Mapa" }} />
      <Stack.Screen
        name="Manutencoes"
        component={EmpresaVeiculoManutencoesScreen}
        options={{ title: "Manutenção" }}
      />
      <Stack.Screen
        name="Lembretes"
        component={EmpresaVeiculoLembretesScreen}
        options={{ title: "Lembretes" }}
      />
      <Stack.Screen
        name="Vinculos"
        component={EmpresaVeiculoVinculosScreen}
        options={{ title: "Vínculos" }}
      />
      <Stack.Screen
        name="Checklist"
        component={EmpresaVeiculoChecklistScreen}
        options={{ title: "Checklist" }}
      />
      <Stack.Screen
        name="Ocorrencias"
        component={EmpresaVeiculoOcorrenciasScreen}
        options={{ title: "Ocorrências" }}
      />
      <Stack.Screen
        name="Auditoria"
        component={EmpresaVeiculoAuditoriaScreen}
        options={{ title: "Histórico" }}
      />
    </Stack.Navigator>
  );
}

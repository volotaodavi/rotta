import { createNativeStackNavigator } from "@react-navigation/native-stack";

import type { EmpresaHomeStackParamList } from "./types";

import {
  EmpresaAlunosPreCadastroScreen,
  EmpresaEquipeScreen,
  EmpresaHomeScreen,
} from "@/features/empresa/screens";

const Stack = createNativeStackNavigator<EmpresaHomeStackParamList>();

/**
 * Stack da aba "Início" da Empresa/Gestor — `Dashboard`,
 * `AlunosPreCadastro` (Frente 2) e `Equipe` (Frente 5). Mesmo papel de
 * aninhamento de `AdminHomeNavigator`: a aba em si nunca muda, só a
 * tela exibida dentro dela.
 */
export function EmpresaHomeNavigator(): JSX.Element {
  return (
    <Stack.Navigator screenOptions={{ headerTitleAlign: "center" }}>
      <Stack.Screen name="Dashboard" component={EmpresaHomeScreen} options={{ title: "Início" }} />
      <Stack.Screen
        name="AlunosPreCadastro"
        component={EmpresaAlunosPreCadastroScreen}
        options={{ title: "Alunos" }}
      />
      <Stack.Screen name="Equipe" component={EmpresaEquipeScreen} options={{ title: "Equipe" }} />
    </Stack.Navigator>
  );
}

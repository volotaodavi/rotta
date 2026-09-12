import { createNativeStackNavigator } from "@react-navigation/native-stack";

import type { EmpresaHomeStackParamList } from "./types";

import { EmpresaAlunosPreCadastroScreen, EmpresaHomeScreen } from "@/features/empresa/screens";

const Stack = createNativeStackNavigator<EmpresaHomeStackParamList>();

/**
 * Stack da aba "Início" da Empresa/Gestor (pedido do usuário
 * 11/09/2026) — `Dashboard` e `AlunosPreCadastro` (Frente 2); `Equipe`
 * entra na Frente 5. Mesmo papel de aninhamento de `AdminHomeNavigator`:
 * a aba em si nunca muda, só a tela exibida dentro dela.
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
    </Stack.Navigator>
  );
}

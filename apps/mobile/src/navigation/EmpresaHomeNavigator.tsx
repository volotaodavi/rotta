import { createNativeStackNavigator } from "@react-navigation/native-stack";

import type { EmpresaHomeStackParamList } from "./types";

import { EmpresaHomeScreen } from "@/features/empresa/screens";

const Stack = createNativeStackNavigator<EmpresaHomeStackParamList>();

/**
 * Stack da aba "Início" da Empresa/Gestor (pedido do usuário
 * 11/09/2026) — só `Dashboard` nesta Frente 1 (fundação); `AlunosPreCadastro`
 * e `Equipe` entram nas Frentes 2 e 5, quando essas telas existirem.
 * Mesmo papel de aninhamento de `AdminHomeNavigator`: a aba em si nunca
 * muda, só a tela exibida dentro dela.
 */
export function EmpresaHomeNavigator(): JSX.Element {
  return (
    <Stack.Navigator screenOptions={{ headerTitleAlign: "center" }}>
      <Stack.Screen name="Dashboard" component={EmpresaHomeScreen} options={{ title: "Início" }} />
    </Stack.Navigator>
  );
}

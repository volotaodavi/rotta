import { createNativeStackNavigator } from "@react-navigation/native-stack";

import type { DriverPerfilStackParamList } from "./types";

import { DriverPerfilScreen } from "@/features/driver/screens";
import { LegalWebViewScreen } from "@/features/legal/screens/legal-webview-screen";

const Stack = createNativeStackNavigator<DriverPerfilStackParamList>();

/**
 * Stack da aba "Perfil" do Motorista/Monitor (Dossiê 45 — Rotta Legal,
 * Trust & Community Center) — mesmo papel de `VeiculoNavigator`: dá à
 * aba `Perfil` (antes uma tela única) uma segunda tela,
 * "Documentação Rotta", sem consumir um item a mais do Bottom
 * Navigation (que já está no limite de 3-4 itens, Dossiê 10 §11.1).
 */
export function DriverPerfilNavigator(): JSX.Element {
  return (
    <Stack.Navigator screenOptions={{ headerTitleAlign: "center" }}>
      <Stack.Screen
        name="PerfilHome"
        component={DriverPerfilScreen}
        options={{ title: "Perfil", headerShown: false }}
      />
      <Stack.Screen
        name="Documentacao"
        component={LegalWebViewScreen}
        options={{ title: "Documentação Rotta" }}
      />
    </Stack.Navigator>
  );
}

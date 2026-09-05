import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { SupportNavigator } from "./SupportNavigator";

import type { ParentPerfilStackParamList } from "./types";

import { LegalWebViewScreen } from "@/features/legal/screens/legal-webview-screen";
import { ParentPerfilScreen } from "@/features/parent/screens";



const Stack = createNativeStackNavigator<ParentPerfilStackParamList>();

/**
 * Stack da aba "Perfil" do Responsável (Dossiê 45 — Rotta Legal, Trust &
 * Community Center) — mesmo papel de `DriverPerfilNavigator`: dá à aba
 * `Perfil` (antes um `PlaceholderScreen`) uma segunda tela,
 * "Documentação Rotta", sem consumir um item a mais do Bottom
 * Navigation (que já está no limite de 4 itens: Mapa/Transporte/
 * Notificações/Perfil — briefing "Marketplace" §"NAVEGAÇÃO").
 */
export function ParentPerfilNavigator(): JSX.Element {
  return (
    <Stack.Navigator screenOptions={{ headerTitleAlign: "center" }}>
      <Stack.Screen
        name="PerfilHome"
        component={ParentPerfilScreen}
        options={{ title: "Perfil", headerShown: false }}
      />
      <Stack.Screen
        name="Documentacao"
        component={LegalWebViewScreen}
        options={{ title: "Documentação Rotta" }}
      />
      <Stack.Screen name="Chamados" component={SupportNavigator} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}

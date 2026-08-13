import { createNativeStackNavigator } from "@react-navigation/native-stack";

import type { VinculoPendenteStackParamList } from "./types";

import { DriverIdentityVerificationWebViewScreen } from "@/features/driver/screens/identity-verification-webview-screen";
import {
  InformarCodigoVinculoScreen,
  VinculoPendenteStatusScreen,
} from "@/features/onboarding-autonomo/screens";

const Stack = createNativeStackNavigator<VinculoPendenteStackParamList>();

/**
 * Navigator mostrado pelo `RootNavigator` no lugar de `DriverNavigator`
 * enquanto o Motorista/Monitor autônomo (Frente N, briefing item 9)
 * ainda não tem `companyId` — Didit + "informar código" +
 * acompanhamento do pedido de vínculo, um passo de cada vez.
 * `VerificacaoIdentidade` reaproveita a MESMA tela WebView de
 * `DriverPerfilNavigator` (nunca duplicada).
 */
export function VinculoPendenteNavigator(): JSX.Element {
  return (
    <Stack.Navigator screenOptions={{ headerTitleAlign: "center" }}>
      <Stack.Screen
        name="Status"
        component={VinculoPendenteStatusScreen}
        options={{ title: "Vínculo pendente" }}
      />
      <Stack.Screen
        name="VerificacaoIdentidade"
        component={DriverIdentityVerificationWebViewScreen}
        options={{ title: "Verificar identidade" }}
      />
      <Stack.Screen
        name="InformarCodigo"
        component={InformarCodigoVinculoScreen}
        options={{ title: "Informar código" }}
      />
    </Stack.Navigator>
  );
}

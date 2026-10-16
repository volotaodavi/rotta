import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { opcoesDoCabecalho } from "./estilo-da-navegacao";

import type { VinculoPendenteStackParamList } from "./types";

import { DriverIdentityVerificationScreen } from "@/features/driver/screens";
import {
  ConverterEmTransportadoraScreen,
  InformarCodigoVinculoScreen,
  VinculoPendenteStatusScreen,
} from "@/features/onboarding-autonomo/screens";
import { useTheme } from "@/providers/theme-provider";

const Stack = createNativeStackNavigator<VinculoPendenteStackParamList>();

/**
 * Navigator mostrado pelo `RootNavigator` no lugar de `DriverNavigator`
 * enquanto o Motorista/Monitor autônomo (Frente N, briefing item 9)
 * ainda não tem `companyId` — Didit + "informar código" +
 * acompanhamento do pedido de vínculo, um passo de cada vez.
 * `VerificacaoIdentidade` reaproveita a MESMA tela nativa de
 * `DriverPerfilNavigator` (nunca duplicada).
 */
export function VinculoPendenteNavigator(): JSX.Element {
  const { theme } = useTheme();
  return (
    <Stack.Navigator screenOptions={{ ...opcoesDoCabecalho(theme), headerTitleAlign: "center" }}>
      <Stack.Screen
        name="Status"
        component={VinculoPendenteStatusScreen}
        options={{ title: "Vínculo pendente" }}
      />
      <Stack.Screen
        name="VerificacaoIdentidade"
        component={DriverIdentityVerificationScreen}
        options={{ title: "Verificar identidade" }}
      />
      <Stack.Screen
        name="InformarCodigo"
        component={InformarCodigoVinculoScreen}
        options={{ title: "Informar código" }}
      />
      <Stack.Screen
        name="ConverterEmTransportadora"
        component={ConverterEmTransportadoraScreen}
        options={{ title: "Minha transportadora" }}
      />
    </Stack.Navigator>
  );
}

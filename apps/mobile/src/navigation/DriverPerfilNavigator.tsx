import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { SupportNavigator } from "./SupportNavigator";
import { VeiculoNavigator } from "./VeiculoNavigator";

import type { DriverPerfilStackParamList } from "./types";

import { DriverPerfilScreen } from "@/features/driver/screens";
import { DriverIdentityVerificationWebViewScreen } from "@/features/driver/screens/identity-verification-webview-screen";
import { LegalWebViewScreen } from "@/features/legal/screens/legal-webview-screen";

const Stack = createNativeStackNavigator<DriverPerfilStackParamList>();

/**
 * Stack da aba "Perfil" do Motorista/Monitor — mesmo papel de
 * `VeiculoNavigator` (que agora vive DENTRO dela, ver `Veiculo` abaixo):
 * dá à aba `Perfil` (antes uma tela única) telas extras ("Documentação
 * Rotta", Dossiê 45; "Verificar identidade", verificação hospedada via
 * Didit; "Meu Veículo", Frente AO) sem consumir um item a mais do
 * Bottom Navigation (que já está no limite de 3-4 itens, Dossiê 10
 * §11.1 — a barra virou Início/Viagens/Notificações/Perfil, igual à
 * referência, e não sobrava espaço pra manter "Veículo" como aba
 * própria). `headerShown: false` em `Veiculo`: `VeiculoNavigator` já
 * põe cabeçalho em cada uma das próprias telas.
 */
export function DriverPerfilNavigator(): JSX.Element {
  return (
    <Stack.Navigator screenOptions={{ headerTitleAlign: "center" }}>
      <Stack.Screen
        name="PerfilHome"
        component={DriverPerfilScreen}
        options={{ title: "Perfil", headerShown: false }}
      />
      <Stack.Screen name="Veiculo" component={VeiculoNavigator} options={{ headerShown: false }} />
      <Stack.Screen
        name="Documentacao"
        component={LegalWebViewScreen}
        options={{ title: "Documentação Rotta" }}
      />
      <Stack.Screen
        name="VerificacaoIdentidade"
        component={DriverIdentityVerificationWebViewScreen}
        options={{ title: "Verificar identidade" }}
      />
      <Stack.Screen name="Chamados" component={SupportNavigator} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}

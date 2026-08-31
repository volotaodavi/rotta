import { createNativeStackNavigator } from "@react-navigation/native-stack";

import type { AuthStackParamList } from "./types";

import {
  AreaPessoalScreen,
  AreaProfissionalScreen,
  ConviteCodigoScreen,
  ConvitePreviewScreen,
  ConviteTransportadoraScreen,
  CriarContaAutonomoScreen,
  CriarContaPessoalScreen,
  CriarContaScreen,
  CriarEmpresaWebViewScreen,
  EntradaScreen,
  LoginScreen,
} from "@/features/auth/screens";


const Stack = createNativeStackNavigator<AuthStackParamList>();

/**
 * Navigator de autenticação (Dossiê 15, `AUTH-01`) — Tela Inicial, Entrar,
 * Criar Conta (Área Profissional/Pessoal), convite e WebView de Criar
 * Empresa. Exibido pelo `RootNavigator` quando não há sessão ativa.
 */
export function AuthNavigator(): JSX.Element {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Entrada" component={EntradaScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="CriarConta" component={CriarContaScreen} />
      <Stack.Screen name="AreaProfissional" component={AreaProfissionalScreen} />
      <Stack.Screen name="AreaPessoal" component={AreaPessoalScreen} />
      <Stack.Screen name="CriarContaPessoal" component={CriarContaPessoalScreen} />
      <Stack.Screen
        name="CriarEmpresaWebView"
        component={CriarEmpresaWebViewScreen}
        options={{ headerShown: true, title: "Criar empresa" }}
      />
      <Stack.Screen name="ConviteCodigo" component={ConviteCodigoScreen} />
      <Stack.Screen name="ConvitePreview" component={ConvitePreviewScreen} />
      <Stack.Screen name="ConviteTransportadora" component={ConviteTransportadoraScreen} />
      <Stack.Screen name="CriarContaAutonomo" component={CriarContaAutonomoScreen} />
    </Stack.Navigator>
  );
}

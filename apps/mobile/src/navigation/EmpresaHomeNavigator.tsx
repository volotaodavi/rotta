import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { SupportNavigator } from "./SupportNavigator";

import type { EmpresaHomeStackParamList } from "./types";

import {
  EmpresaAlunosPreCadastroScreen,
  EmpresaAssinaturaScreen,
  EmpresaEquipeScreen,
  EmpresaHomeScreen,
  EmpresaMarketplaceContratoDetalheScreen,
  EmpresaMarketplaceContratosScreen,
  EmpresaMarketplaceSolicitacaoDetalheScreen,
  EmpresaMarketplaceSolicitacoesScreen,
} from "@/features/empresa/screens";

const Stack = createNativeStackNavigator<EmpresaHomeStackParamList>();

/**
 * Stack da aba "Início" da Empresa/Gestor — `Dashboard`,
 * `AlunosPreCadastro` (Frente 2), `Equipe` (Frente 5) e Marketplace
 * (Frente A — solicitações recebidas + contratos). Mesmo papel de
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
      <Stack.Screen
        name="Assinatura"
        component={EmpresaAssinaturaScreen}
        options={{ title: "Assinatura" }}
      />
      <Stack.Screen name="Chamados" component={SupportNavigator} options={{ headerShown: false }} />
      <Stack.Screen
        name="MarketplaceSolicitacoes"
        component={EmpresaMarketplaceSolicitacoesScreen}
        options={{ title: "Solicitações" }}
      />
      <Stack.Screen
        name="MarketplaceSolicitacaoDetalhe"
        component={EmpresaMarketplaceSolicitacaoDetalheScreen}
        options={{ title: "Solicitação" }}
      />
      <Stack.Screen
        name="MarketplaceContratos"
        component={EmpresaMarketplaceContratosScreen}
        options={{ title: "Contratos" }}
      />
      <Stack.Screen
        name="MarketplaceContratoDetalhe"
        component={EmpresaMarketplaceContratoDetalheScreen}
        options={{ title: "Contrato" }}
      />
    </Stack.Navigator>
  );
}

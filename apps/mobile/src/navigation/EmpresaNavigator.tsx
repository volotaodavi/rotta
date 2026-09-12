import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Bell, Bus, Home, Route, User } from "@rotta/icons/native";

import { EmpresaHomeNavigator } from "./EmpresaHomeNavigator";
import { NotificacoesNavigator } from "./NotificacoesNavigator";

import type { EmpresaTabParamList } from "./types";

import { ComingSoonScreen } from "@/components/coming-soon-screen";
import { EmpresaPerfilScreen } from "@/features/empresa/screens";
import { useUnreadNotificationsCount } from "@/features/notifications/hooks/use-notifications";

const Tab = createBottomTabNavigator<EmpresaTabParamList>();

/** Placeholder da aba "Frota" até a Frente 3 (lista/detalhe/criar de veículos) entrar. */
function FrotaPlaceholder(): JSX.Element {
  return (
    <ComingSoonScreen
      titulo="Frota"
      corpo="Em breve você vai poder ver e gerenciar seus veículos direto por aqui."
    />
  );
}

/** Placeholder da aba "Rotas" até a Frente 4 (lista/detalhe/criar de rotas) entrar. */
function RotasPlaceholder(): JSX.Element {
  return (
    <ComingSoonScreen
      titulo="Rotas"
      corpo="Em breve você vai poder ver e gerenciar suas rotas direto por aqui."
    />
  );
}

/**
 * Navegação da Empresa/Gestor no app (pedido do usuário 11/09/2026:
 * "O app tá faltando muita coisa. Veja oq tem na web e traga para o
 * app oficial" — escopo confirmado como versão reduzida). Antes,
 * `empresa`/`gestor` caíam sempre em `PainelWebOnlyScreen` (ver
 * `RootNavigator`) — esta é a primeira navegação própria desses
 * papéis.
 *
 * Fica só na Web (paridade completa fica pra depois): Escolas,
 * Marketplace, Chamados, Assinatura, relatórios avançados de Veículos
 * (auditoria/lembretes/manutenções/checklist/ocorrências), otimização
 * de rota por IA, edição de endereço livre em parada — ver
 * `EmpresaTabParamList` pro raciocínio completo de escopo.
 *
 * `Frota`/`Rotas` mostram `ComingSoonScreen` nesta Frente 1
 * (fundação) — viram reais nas Frentes 3/4. `Notificacoes` reaproveita
 * a mesma Central de qualquer papel (`NotificacoesNavigator` é
 * agnóstica).
 */
export function EmpresaNavigator(): JSX.Element {
  const { data: naoLidas } = useUnreadNotificationsCount();

  return (
    <Tab.Navigator initialRouteName="Inicio" screenOptions={{ headerShown: false }}>
      <Tab.Screen
        name="Inicio"
        component={EmpresaHomeNavigator}
        options={{
          tabBarLabel: "Início",
          tabBarIcon: ({ size, color }) => <Home size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Frota"
        component={FrotaPlaceholder}
        options={{ tabBarIcon: ({ size, color }) => <Bus size={size} color={color} /> }}
      />
      <Tab.Screen
        name="Rotas"
        component={RotasPlaceholder}
        options={{ tabBarIcon: ({ size, color }) => <Route size={size} color={color} /> }}
      />
      <Tab.Screen
        name="Notificacoes"
        component={NotificacoesNavigator}
        options={{
          tabBarLabel: "Notificações",
          tabBarBadge: naoLidas ? naoLidas : undefined,
          tabBarIcon: ({ size, color }) => <Bell size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Perfil"
        component={EmpresaPerfilScreen}
        options={{
          headerShown: true,
          title: "Perfil",
          tabBarIcon: ({ size, color }) => <User size={size} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}

import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Bell, Headset, Home, User } from "@rotta/icons/native";


import { AdminHomeNavigator } from "./AdminHomeNavigator";
import { AdminSupportNavigator } from "./AdminSupportNavigator";
import { NotificacoesNavigator } from "./NotificacoesNavigator";

import type { AdminTabParamList } from "./types";

import { AdminPerfilScreen } from "@/features/admin/screens";
import { useUnreadNotificationsCount } from "@/features/notifications/hooks/use-notifications";

const Tab = createBottomTabNavigator<AdminTabParamList>();

/**
 * Navegação do Admin Rotta no app (pedido do usuário 05/09/2026: "área
 * do admin no app, porém de forma reduzida... enquanto a web fica
 * completa, a área do admin no app poderia ser reduzida"). Antes,
 * `admin_rotta` caía sempre em `PainelWebOnlyScreen` (ver
 * `RootNavigator`) — esta é a primeira navegação própria desse papel.
 *
 * Escopo deliberadamente reduzido (fica só na Web: financeiro completo
 * com transferências/estornos, gestão de empresas/veículos/escolas,
 * marketplace, auditoria legal, contas admin): Início (KPIs + fila de
 * aprovações, ambos somente-leitura), Suporte (chat com qualquer
 * empresa/responsável — mesma tela de chat do resto do app), mesma
 * Central de Notificações de qualquer outro papel (`NotificacoesNavigator`,
 * agnóstica de papel) e Perfil (dados da conta + sair).
 */
export function AdminNavigator(): JSX.Element {
  const { data: naoLidas } = useUnreadNotificationsCount();

  return (
    <Tab.Navigator initialRouteName="Inicio" screenOptions={{ headerShown: false }}>
      <Tab.Screen
        name="Inicio"
        component={AdminHomeNavigator}
        options={{
          tabBarLabel: "Início",
          tabBarIcon: ({ size, color }) => <Home size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Suporte"
        component={AdminSupportNavigator}
        options={{ tabBarIcon: ({ size, color }) => <Headset size={size} color={color} /> }}
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
        component={AdminPerfilScreen}
        options={{
          headerShown: true,
          title: "Perfil",
          tabBarIcon: ({ size, color }) => <User size={size} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}

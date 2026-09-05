import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useAuth } from "@rotta/auth/native";
import { Bell, Headset, Home, User, Wallet } from "@rotta/icons/native";


import { AdminFinanceiroNavigator } from "./AdminFinanceiroNavigator";
import { AdminHomeNavigator } from "./AdminHomeNavigator";
import { AdminSupportNavigator } from "./AdminSupportNavigator";
import { NotificacoesNavigator } from "./NotificacoesNavigator";

import type { AdminTabParamList } from "./types";

import { AdminPerfilScreen } from "@/features/admin/screens";
import { useUnreadNotificationsCount } from "@/features/notifications/hooks/use-notifications";

const Tab = createBottomTabNavigator<AdminTabParamList>();

/**
 * Navegação do Admin Rotta no app (pedido do usuário 05/09/2026: "área
 * do admin no app"). Antes, `admin_rotta` caía sempre em
 * `PainelWebOnlyScreen` (ver `RootNavigator`) — esta é a primeira
 * navegação própria desse papel.
 *
 * Fica só na Web (gestão de empresas/veículos/escolas, marketplace,
 * auditoria legal, contas admin — operações raras/administrativas
 * demais pra uma tela pequena): Início (KPIs + fila de aprovações,
 * ambos somente-leitura), Suporte (chat com qualquer empresa/
 * responsável), Financeiro (completo — saldo/extrato/transferências/
 * cobranças Pix/estornos, pedido do usuário 05/09/2026: "pode adicionar
 * o financeiro completo para admins no app"), Notificações (mesma
 * Central de qualquer papel, `NotificacoesNavigator` é agnóstica) e
 * Perfil.
 *
 * `Financeiro` só aparece pra sub-papel GERAL/FINANCEIRO — SUPORTE não
 * acessa nenhuma área financeira nem no Painel Web (RBAC dos
 * sub-papéis); esta checagem no front só decide se a ABA aparece, o
 * backend (`AdminAreaGuard`) é quem realmente barra cada rota.
 */
export function AdminNavigator(): JSX.Element {
  const { user } = useAuth();
  const { data: naoLidas } = useUnreadNotificationsCount();
  const podeVerFinanceiro = (user?.adminPapel ?? "GERAL") !== "SUPORTE";

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
      {podeVerFinanceiro ? (
        <Tab.Screen
          name="Financeiro"
          component={AdminFinanceiroNavigator}
          options={{ tabBarIcon: ({ size, color }) => <Wallet size={size} color={color} /> }}
        />
      ) : null}
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

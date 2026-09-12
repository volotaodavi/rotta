import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Bell, Bus, Home, Route, User } from "@rotta/icons/native";

import { EmpresaFrotaNavigator } from "./EmpresaFrotaNavigator";
import { EmpresaHomeNavigator } from "./EmpresaHomeNavigator";
import { EmpresaRotasNavigator } from "./EmpresaRotasNavigator";
import { NotificacoesNavigator } from "./NotificacoesNavigator";

import type { EmpresaTabParamList } from "./types";

import { EmpresaPerfilScreen } from "@/features/empresa/screens";
import { useUnreadNotificationsCount } from "@/features/notifications/hooks/use-notifications";

const Tab = createBottomTabNavigator<EmpresaTabParamList>();

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
 * `Frota` (Frente 3) e `Rotas` (Frente 4) já são reais. `Notificacoes`
 * reaproveita a mesma Central de qualquer papel (`NotificacoesNavigator`
 * é agnóstica).
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
        component={EmpresaFrotaNavigator}
        options={{ tabBarIcon: ({ size, color }) => <Bus size={size} color={color} /> }}
      />
      <Tab.Screen
        name="Rotas"
        component={EmpresaRotasNavigator}
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

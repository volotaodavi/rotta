import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Bell, Bus, Home, Route, User } from "@rotta/icons/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EmpresaFrotaNavigator } from "./EmpresaFrotaNavigator";
import { EmpresaHomeNavigator } from "./EmpresaHomeNavigator";
import { EmpresaRotasNavigator } from "./EmpresaRotasNavigator";
import { opcoesDaBarraDeAbas, opcoesDoCabecalhoDeAba, SeloDeAba } from "./estilo-da-navegacao";
import { NotificacoesNavigator } from "./NotificacoesNavigator";

import type { EmpresaTabParamList } from "./types";

import { RottaSymbol } from "@/components/rotta-symbol";
import { usePendingJoinRequests } from "@/features/empresa/hooks/use-empresa-team";
import { EmpresaPerfilScreen } from "@/features/empresa/screens";
import { useUnreadNotificationsCount } from "@/features/notifications/hooks/use-notifications";
import { useTheme } from "@/providers/theme-provider";

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
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { data: naoLidas } = useUnreadNotificationsCount();
  // Frente 5 fechou o placeholder deixado na Frente 1: badge da aba
  // Início = contagem de pedidos de vínculo pendentes (ação real,
  // não só leitura — mesmo raciocínio da fila de Aprovações do Admin).
  const { data: pedidosPendentes } = usePendingJoinRequests();

  return (
    <Tab.Navigator
      initialRouteName="Inicio"
      screenOptions={{
        ...opcoesDaBarraDeAbas(theme, insets.bottom),
        ...opcoesDoCabecalhoDeAba(theme),
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="Inicio"
        component={EmpresaHomeNavigator}
        options={{
          tabBarLabel: "Início",
          tabBarBadge:
            pedidosPendentes && pedidosPendentes.length > 0 ? pedidosPendentes.length : undefined,
          tabBarIcon: ({ size, color, focused }) => (
            <SeloDeAba ativo={focused} theme={theme}>
              <RottaSymbol
                ios="house.fill"
                fallback={Home}
                size={size - 2}
                color={focused ? theme.colors.onPrimary : color}
              />
            </SeloDeAba>
          ),
        }}
      />
      <Tab.Screen
        name="Frota"
        component={EmpresaFrotaNavigator}
        options={{
          tabBarIcon: ({ size, color, focused }) => (
            <SeloDeAba ativo={focused} theme={theme}>
              <RottaSymbol
                ios="bus.fill"
                fallback={Bus}
                size={size - 2}
                color={focused ? theme.colors.onPrimary : color}
              />
            </SeloDeAba>
          ),
        }}
      />
      <Tab.Screen
        name="Rotas"
        component={EmpresaRotasNavigator}
        options={{
          tabBarIcon: ({ size, color, focused }) => (
            <SeloDeAba ativo={focused} theme={theme}>
              <RottaSymbol
                ios="arrow.triangle.turn.up.right.diamond.fill"
                fallback={Route}
                size={size - 2}
                color={focused ? theme.colors.onPrimary : color}
              />
            </SeloDeAba>
          ),
        }}
      />
      <Tab.Screen
        name="Notificacoes"
        component={NotificacoesNavigator}
        options={{
          tabBarLabel: "Notificações",
          tabBarBadge: naoLidas ? naoLidas : undefined,
          tabBarIcon: ({ size, color, focused }) => (
            <SeloDeAba ativo={focused} theme={theme}>
              <RottaSymbol
                ios="bell.fill"
                fallback={Bell}
                size={size - 2}
                color={focused ? theme.colors.onPrimary : color}
              />
            </SeloDeAba>
          ),
        }}
      />
      <Tab.Screen
        name="Perfil"
        component={EmpresaPerfilScreen}
        options={{
          headerShown: true,
          title: "Perfil",
          tabBarIcon: ({ size, color, focused }) => (
            <SeloDeAba ativo={focused} theme={theme}>
              <RottaSymbol
                ios="person.fill"
                fallback={User}
                size={size - 2}
                color={focused ? theme.colors.onPrimary : color}
              />
            </SeloDeAba>
          ),
        }}
      />
    </Tab.Navigator>
  );
}

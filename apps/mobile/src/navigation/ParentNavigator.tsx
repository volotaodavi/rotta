import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Bell, History, Home, User } from "@rotta/icons/native";

import { NotificacoesNavigator } from "./NotificacoesNavigator";
import { ParentPerfilNavigator } from "./ParentPerfilNavigator";

import type { ParentTabParamList } from "./types";

import { useResponsavelTransportState } from "@/features/marketplace/hooks/use-transport-state";
import { TRANSPORT_TAB_LABEL } from "@/features/marketplace/labels";
import {
  MarketplaceComingSoonScreen,
  TransporteInicioScreen,
} from "@/features/marketplace/screens";
import { useUnreadNotificationsCount } from "@/features/notifications/hooks/use-notifications";

const Tab = createBottomTabNavigator<ParentTabParamList>();

/**
 * Navegação do Responsável (Dossie 10, Secao 11.1; briefing
 * "Marketplace" §"NAVEGAÇÃO") — Bottom Navigation: Mapa (tela padrão
 * sempre que o app abre), Transporte (rótulo dinâmico pelos 5 estados
 * do Responsável — `TRANSPORT_TAB_LABEL`), Notificações, Perfil.
 *
 * Frente AO — antes esta barra não tinha NENHUM ícone (só texto); as 3
 * imagens de referência do usuário sempre mostram ícone+rótulo, e
 * chamam essas 4 abas de Início/Viagens/Notificações/Perfil (mesmos
 * nomes em todos os papéis — paridade com `ResponsavelBottomNav` da
 * versão web). `tabBarLabel` da 2ª aba virou fixo "Viagens" pra bater
 * com a referência; `title`/cabeçalho da própria tela continuam usando
 * `TRANSPORT_TAB_LABEL[state]` (Solicitação/Contrato/Meu Transporte…) —
 * informação real de progresso que a referência não precisa comunicar
 * (ela nunca mostra os estados intermediários do Responsável sem
 * transporte contratado ainda), então mantida só dentro da tela.
 */
export function ParentNavigator(): JSX.Element {
  const { state } = useResponsavelTransportState();
  const { data: naoLidas } = useUnreadNotificationsCount();

  return (
    <Tab.Navigator initialRouteName="Mapa" screenOptions={{ headerShown: false }}>
      <Tab.Screen
        name="Mapa"
        component={MarketplaceComingSoonScreen}
        options={{
          headerShown: true,
          title: "Início",
          tabBarLabel: "Início",
          tabBarIcon: ({ size, color }) => <Home size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Transporte"
        component={TransporteInicioScreen}
        options={{
          title: TRANSPORT_TAB_LABEL[state],
          tabBarLabel: "Viagens",
          tabBarIcon: ({ size, color }) => <History size={size} color={color} />,
        }}
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
        component={ParentPerfilNavigator}
        options={{ tabBarIcon: ({ size, color }) => <User size={size} color={color} /> }}
      />
    </Tab.Navigator>
  );
}

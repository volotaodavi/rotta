import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";

import { MarketplaceNavigator } from "./MarketplaceNavigator";
import { NotificacoesNavigator } from "./NotificacoesNavigator";
import { ParentPerfilNavigator } from "./ParentPerfilNavigator";

import type { ParentTabParamList } from "./types";

import { useResponsavelTransportState } from "@/features/marketplace/hooks/use-transport-state";
import { TRANSPORT_TAB_LABEL } from "@/features/marketplace/labels";
import { TransporteInicioScreen } from "@/features/marketplace/screens";
import { useUnreadNotificationsCount } from "@/features/notifications/hooks/use-notifications";

const Tab = createBottomTabNavigator<ParentTabParamList>();

/**
 * Navegação do Responsável (Dossie 10, Secao 11.1; briefing
 * "Marketplace" §"NAVEGAÇÃO") — Bottom Navigation: Mapa (tela padrão
 * sempre que o app abre), Transporte (rótulo dinâmico pelos 5 estados
 * do Responsável — `TRANSPORT_TAB_LABEL`), Notificações, Perfil.
 */
export function ParentNavigator(): JSX.Element {
  const { state } = useResponsavelTransportState();
  const { data: naoLidas } = useUnreadNotificationsCount();

  return (
    <Tab.Navigator initialRouteName="Mapa" screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Mapa" component={MarketplaceNavigator} />
      <Tab.Screen
        name="Transporte"
        component={TransporteInicioScreen}
        options={{ title: TRANSPORT_TAB_LABEL[state], tabBarLabel: TRANSPORT_TAB_LABEL[state] }}
      />
      <Tab.Screen
        name="Notificacoes"
        component={NotificacoesNavigator}
        options={{ tabBarBadge: naoLidas ? naoLidas : undefined }}
      />
      <Tab.Screen name="Perfil" component={ParentPerfilNavigator} />
    </Tab.Navigator>
  );
}

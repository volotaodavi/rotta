import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Bell, History, Home, Map, User } from "@rotta/icons/native";

import { MarketplaceNavigator } from "./MarketplaceNavigator";
import { NotificacoesNavigator } from "./NotificacoesNavigator";
import { ParentPerfilNavigator } from "./ParentPerfilNavigator";

import type { ParentTabParamList } from "./types";

import { useResponsavelTransportState } from "@/features/marketplace/hooks/use-transport-state";
import { TRANSPORT_TAB_LABEL } from "@/features/marketplace/labels";
import { ParentInicioScreen, TransporteInicioScreen } from "@/features/marketplace/screens";
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
 *
 * `Mapa` reativado (pedido do usuário 11/09/2026: "TODOS DEVERÃO TER
 * MAPA") — tinha sido trocado por `MarketplaceComingSoonScreen`
 * (01/09/2026), agora volta a montar o `MarketplaceNavigator` de
 * verdade (busca de transportador, mapa, solicitar transporte). Sem
 * `headerShown`/`title` aqui: o próprio `MarketplaceNavigator` já
 * gerencia o header de cada tela interna (mesmo padrão de
 * `EmpresaNavigator`/`AdminNavigator` — a aba nunca sobrepõe header
 * duplicado em cima de uma stack aninhada).
 */
export function ParentNavigator(): JSX.Element {
  const { state } = useResponsavelTransportState();
  const { data: naoLidas } = useUnreadNotificationsCount();

  return (
    <Tab.Navigator initialRouteName="Inicio" screenOptions={{ headerShown: false }}>
      <Tab.Screen
        name="Inicio"
        component={ParentInicioScreen}
        options={{
          headerShown: true,
          title: "",
          tabBarLabel: "Início",
          tabBarIcon: ({ size, color }) => <Home size={size} color={color} />,
        }}
      />
      {/* `headerShown` (achado 15/09/2026, print do usuário): sem
          cabeçalho, o conteúdo desta aba encostava na barra de status do
          celular ("Você ainda não tem transporte escolar" colado no
          relógio) — `VehicleScreen` aplica padding, mas não a margem de
          segurança do topo, que quem resolve é o cabeçalho do
          navegador. O título dinâmico (`TRANSPORT_TAB_LABEL[state]`) já
          existia e nunca aparecia; agora aparece, como na tela 11 da
          referência ("Viagens", título no topo). */}
      <Tab.Screen
        name="Transporte"
        component={TransporteInicioScreen}
        options={{
          headerShown: true,
          title: TRANSPORT_TAB_LABEL[state],
          tabBarLabel: "Viagens",
          tabBarIcon: ({ size, color }) => <History size={size} color={color} />,
        }}
      />
      {/* "Mapa" como aba própria (referência: Início · Viagens · Mapa ·
          Notificações · Perfil). Sem `headerShown`/`title`: o próprio
          `MarketplaceNavigator` já gerencia o header de cada tela
          interna. */}
      <Tab.Screen
        name="Mapa"
        component={MarketplaceNavigator}
        options={{
          tabBarLabel: "Mapa",
          tabBarIcon: ({ size, color }) => <Map size={size} color={color} />,
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

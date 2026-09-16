import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Bell, History, Home, User } from "@rotta/icons/native";

import { DriverPerfilNavigator } from "./DriverPerfilNavigator";
import { NotificacoesNavigator } from "./NotificacoesNavigator";

import type { DriverTabParamList } from "./types";
import type { LucideIcon } from "@rotta/icons/native";

import { RottaSymbol } from "@/components/rotta-symbol";
import { DriverHistoricoScreen, DriverInicioScreen } from "@/features/driver/screens";
import { useUnreadNotificationsCount } from "@/features/notifications/hooks/use-notifications";

const Tab = createBottomTabNavigator<DriverTabParamList>();

/**
 * Ícone de cada aba (Frente AO — antes esta barra não tinha NENHUM
 * ícone, só texto; as 3 imagens de referência sempre mostram
 * ícone+rótulo). `size`/`color` chegam prontos do próprio
 * `tabBarIcon(props)` do react-navigation.
 */
const TAB_ICON: Record<keyof DriverTabParamList, LucideIcon> = {
  Inicio: Home,
  Historico: History,
  Notificacoes: Bell,
  Perfil: User,
};

/**
 * SF Symbol equivalente de cada aba — usado só no iOS (`RottaSymbol`),
 * onde o símbolo vem do próprio sistema. No Android continua o ícone
 * Lucide de `TAB_ICON` acima.
 */
const TAB_SF_SYMBOL: Record<keyof DriverTabParamList, string> = {
  Inicio: "house.fill",
  Historico: "clock.arrow.circlepath",
  Notificacoes: "bell.fill",
  Perfil: "person.fill",
};

/**
 * Navegação do Motorista/Monitor (Dossie 10, Secao 11.1) — Bottom
 * Navigation com no máximo 3-4 itens, conforme especificado. "Início"/
 * "Histórico"/"Perfil" eram placeholders "em construção" desde a
 * fundação do app — fechados no Prompt Mestre da Rotta (Seções 7/8/9):
 * o backend (`TripsModule`/`RoutesModule`) já existia e já era testado,
 * faltava só a tela. "Veículo" já era real (Dossiê 23, tarefa #59).
 *
 * Frente AO — rótulos/ícones corrigidos pra bater com as 3 imagens de
 * referência do usuário (Início/Viagens/Notificações/Perfil, mesma
 * barra em todos os papéis — paridade com `DriverBottomNav`/
 * `ResponsavelBottomNav` da versão web). A rota `Historico` continua
 * com esse nome internamente (só o rótulo virou "Viagens"); "Veículo"
 * saiu da barra e virou um atalho dentro de "Perfil"
 * (`DriverPerfilNavigator`), abrindo espaço pra "Notificações" —
 * reaproveita a MESMA `NotificacoesNavigator` do `ParentNavigator`
 * (Central de Notificações não muda por papel), com o mesmo badge de
 * não lidas.
 */
export function DriverNavigator(): JSX.Element {
  const { data: naoLidas } = useUnreadNotificationsCount();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ size, color }) => {
          const nome = route.name as keyof DriverTabParamList;
          return (
            <RottaSymbol
              ios={TAB_SF_SYMBOL[nome]}
              fallback={TAB_ICON[nome]}
              size={size}
              color={color}
            />
          );
        },
      })}
    >
      <Tab.Screen name="Inicio" component={DriverInicioScreen} options={{ title: "Início" }} />
      <Tab.Screen
        name="Historico"
        component={DriverHistoricoScreen}
        options={{ title: "Viagens" }}
      />
      <Tab.Screen
        name="Notificacoes"
        component={NotificacoesNavigator}
        options={{ title: "Notificações", tabBarBadge: naoLidas ? naoLidas : undefined }}
      />
      <Tab.Screen name="Perfil" component={DriverPerfilNavigator} options={{ title: "Perfil" }} />
    </Tab.Navigator>
  );
}

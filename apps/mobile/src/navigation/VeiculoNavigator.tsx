import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuth } from "@rotta/auth/native";

import { opcoesDoCabecalho } from "./estilo-da-navegacao";

import type { VeiculoStackParamList } from "./types";

import {
  EscolaDetalhesScreen,
  EscolaHorariosScreen,
  EscolaMapaScreen,
  EscolaRotasVinculadasScreen,
  EscolasScreen,
} from "@/features/schools/screens";
import {
  ChecklistScreen,
  DocumentosScreen,
  FotosScreen,
  HistoricoScreen,
  MeuVeiculoScreen,
  OcorrenciasScreen,
} from "@/features/vehicles/screens";
import { CarteiraScreen, WalletComingSoonScreen } from "@/features/wallet/screens";
import { FUNCIONALIDADES } from "@/lib/funcionalidades";
import { useTheme } from "@/providers/theme-provider";

const Stack = createNativeStackNavigator<VeiculoStackParamList>();

/**
 * Stack de "Meu Veículo" (briefing "APP MOBILE") — telas Fotos/
 * Documentos/Histórico/Ocorrências/Checklist, todas sobre o veículo
 * atualmente vinculado ao Motorista/Monitor autenticado (`GET /vehicles/
 * me`). Montada como a tela da aba `Veiculo` em `DriverNavigator`.
 *
 * Também aninha as telas do módulo Escolas (Escolas/Detalhes/Mapa/Rotas
 * vinculadas/Horários) e a Carteira Rotta Pay (Dossiê 26) — sem aba
 * própria, já que o Bottom Navigation do Motorista está no limite de
 * 3-4 itens (Dossiê 10 §11.1); acessadas a partir dos botões "Escolas
 * atendidas"/"Rotta Pay" em `MeuVeiculoScreen`.
 *
 * Rotta Pay desativado temporariamente pro Motorista/Monitor FUNCIONÁRIO
 * (pedido do usuário 02/09/2026: "não estará disponível no momento") —
 * rota "Carteira" aponta pro placeholder `WalletComingSoonScreen` pra
 * eles. Reativado (Frente 6, 11/09/2026) SÓ pro dono autônomo/MEI em
 * "Modo Ação" (`role === "empresa"` — a única forma de esta stack ser
 * alcançada com esse `role`, já que `EmpresaNavigator`/"Visão completa"
 * nunca monta `VeiculoNavigator`): "Motorista (autônomo/MEI) - Tudo oq
 * o motorista anterior tem + financeiro..." — pedido explícito do
 * usuário. `CarteiraScreen` real nunca mudou, só qual role a alcança.
 *
 * Desde 28/10/2026 a decisão é de configuração, não de código
 * (`lib/funcionalidades.ts`): a carteira real exige a área ABERTA
 * (`EXPO_PUBLIC_FEATURE_ROTTA_PAY`) **e** o dono autônomo/MEI. As duas
 * condições somam porque respondem perguntas diferentes — a flag diz
 * se o Rotta Pay existe para alguém, a role diz para quem. Sem a
 * flag, a área está fechada e nem o dono vê a carteira: é o estado
 * vigente, e abri-la deixou de exigir um build novo.
 */
export function VeiculoNavigator(): JSX.Element {
  const { theme } = useTheme();
  const { user } = useAuth();
  const isAutonomoOuMeiEmModoAcao = user?.role === "empresa";

  return (
    <Stack.Navigator screenOptions={{ ...opcoesDoCabecalho(theme), headerTitleAlign: "center" }}>
      <Stack.Screen
        name="MeuVeiculo"
        component={MeuVeiculoScreen}
        options={{ title: "Meu Veículo" }}
      />
      <Stack.Screen name="Fotos" component={FotosScreen} options={{ title: "Fotos" }} />
      <Stack.Screen
        name="Documentos"
        component={DocumentosScreen}
        options={{ title: "Documentos" }}
      />
      <Stack.Screen name="Historico" component={HistoricoScreen} options={{ title: "Histórico" }} />
      <Stack.Screen
        name="Ocorrencias"
        component={OcorrenciasScreen}
        options={{ title: "Ocorrências" }}
      />
      <Stack.Screen name="Checklist" component={ChecklistScreen} options={{ title: "Checklist" }} />
      <Stack.Screen name="Escolas" component={EscolasScreen} options={{ title: "Escolas" }} />
      <Stack.Screen
        name="EscolaDetalhes"
        component={EscolaDetalhesScreen}
        options={{ title: "Escola" }}
      />
      <Stack.Screen name="EscolaMapa" component={EscolaMapaScreen} options={{ title: "Mapa" }} />
      <Stack.Screen
        name="EscolaRotasVinculadas"
        component={EscolaRotasVinculadasScreen}
        options={{ title: "Rotas vinculadas" }}
      />
      <Stack.Screen
        name="EscolaHorarios"
        component={EscolaHorariosScreen}
        options={{ title: "Horários" }}
      />
      <Stack.Screen
        name="Carteira"
        component={
          FUNCIONALIDADES.rottaPay && isAutonomoOuMeiEmModoAcao
            ? CarteiraScreen
            : WalletComingSoonScreen
        }
        /*
          `headerShown: false` só aqui: a Carteira desenha o próprio
          cabeçalho azul, que sangra até a barra de status, como no
          conceito aprovado em 16/10/2026. Com a barra do navegador
          por cima ficariam dois cabeçalhos na mesma tela. A volta
          existe dentro do cabeçalho azul, e o gesto de arrastar da
          borda continua valendo.
        */
        options={{ title: "Rotta Pay", headerShown: !isAutonomoOuMeiEmModoAcao }}
      />
    </Stack.Navigator>
  );
}

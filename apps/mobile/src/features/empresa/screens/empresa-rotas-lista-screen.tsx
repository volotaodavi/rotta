import { Route } from "@rotta/icons/native";
import { EmptyState } from "@rotta/ui/native";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";

import { useRoutesList } from "../hooks/use-empresa-routes";
import { useMyTeam } from "../hooks/use-empresa-team";

import type { EmpresaRotasStackParamList } from "@/navigation/types";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { Texto } from "@/components/texto";
import {
  formatRouteWeekdaysAbbrev,
  ROUTE_STATUS_LABEL,
  ROUTE_STATUS_TONE,
} from "@/features/routes/labels";
import { SCHOOL_SHIFT_LABEL } from "@/features/schools/labels";
import {
  StatusPill,
  VehicleButton,
  VehicleCard,
  VehicleScreen,
} from "@/features/vehicles/components";
import { useTheme } from "@/providers/theme-provider";

type Props = NativeStackScreenProps<EmpresaRotasStackParamList, "Lista">;

/**
 * Rotas — listagem (Frente 4a) — espelha `apps/web/.../rotas/page.tsx`
 * em escopo reduzido: nome, turno, dias da semana, motorista, status.
 * Motorista resolvido cruzando `motoristaPadraoId` com `useMyTeam`,
 * mesma solução da Web (a API de rotas não devolve o nome pronto).
 */
export function EmpresaRotasListaScreen({ navigation }: Props): JSX.Element {
  const { theme } = useTheme();
  const { data, isLoading, isError, refetch } = useRoutesList({ pageSize: 100 });
  const { data: team } = useMyTeam();

  function nomeMotorista(motoristaPadraoId: string | null): string {
    if (!motoristaPadraoId) return "Nenhum motorista atribuído";
    return team?.find((membro) => membro.userId === motoristaPadraoId)?.nome ?? "Motorista";
  }

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  if (isError) {
    return (
      <VehicleScreen>
        <Texto style={{ color: theme.colors.danger }}>Não foi possível carregar as rotas.</Texto>
        <VehicleButton label="Tentar novamente" onPress={() => void refetch()} />
      </VehicleScreen>
    );
  }

  return (
    <VehicleScreen>
      <VehicleButton label="+ Nova rota" onPress={() => navigation.navigate("Novo")} />

      {!data || data.items.length === 0 ? (
        <EmptyState
          title="Nenhuma rota cadastrada"
          description="A rota é o que liga veículo, motorista, escola e alunos."
          icon={<Route size={28} color={theme.colors.primary} />}
          theme={theme}
        />
      ) : (
        data.items.map((route) => (
          <Pressable
            accessibilityRole="button"
            key={route.id}
            onPress={() => navigation.navigate("Detalhe", { routeId: route.id })}
          >
            <VehicleCard>
              <View style={styles.linha}>
                <Texto style={[styles.nome, { color: theme.colors.text }]} numberOfLines={1}>
                  {route.nome}
                </Texto>
                <StatusPill
                  label={ROUTE_STATUS_LABEL[route.status]}
                  tone={ROUTE_STATUS_TONE[route.status]}
                />
              </View>
              <Texto style={{ color: theme.colors.textMuted, fontSize: 14 }}>
                {SCHOOL_SHIFT_LABEL[route.turno]} · {formatRouteWeekdaysAbbrev(route.diasSemana)}
              </Texto>
              <Texto style={{ color: theme.colors.textMuted, fontSize: 14 }}>
                {nomeMotorista(route.motoristaPadraoId)}
              </Texto>
            </VehicleCard>
          </Pressable>
        ))
      )}
    </VehicleScreen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center", flex: 1, justifyContent: "center" },
  linha: { alignItems: "center", flexDirection: "row", gap: 8, justifyContent: "space-between" },
  nome: { flex: 1, fontSize: 16, fontWeight: "600" },
});

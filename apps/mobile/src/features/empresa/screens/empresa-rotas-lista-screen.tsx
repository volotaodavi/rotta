import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { useRoutesList } from "../hooks/use-empresa-routes";
import { useMyTeam } from "../hooks/use-empresa-team";

import type { EmpresaRotasStackParamList } from "@/navigation/types";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

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
        <Text style={{ color: theme.colors.danger }}>Não foi possível carregar as rotas.</Text>
        <VehicleButton label="Tentar novamente" onPress={() => void refetch()} />
      </VehicleScreen>
    );
  }

  return (
    <VehicleScreen>
      <VehicleButton label="+ Nova rota" onPress={() => navigation.navigate("Novo")} />

      {!data || data.items.length === 0 ? (
        <Text style={{ color: theme.colors.textMuted }}>Nenhuma rota cadastrada ainda.</Text>
      ) : (
        data.items.map((route) => (
          <Pressable
            key={route.id}
            onPress={() => navigation.navigate("Detalhe", { routeId: route.id })}
          >
            <VehicleCard>
              <View style={styles.linha}>
                <Text style={[styles.nome, { color: theme.colors.text }]} numberOfLines={1}>
                  {route.nome}
                </Text>
                <StatusPill
                  label={ROUTE_STATUS_LABEL[route.status]}
                  tone={ROUTE_STATUS_TONE[route.status]}
                />
              </View>
              <Text style={{ color: theme.colors.textMuted, fontSize: 13 }}>
                {SCHOOL_SHIFT_LABEL[route.turno]} · {formatRouteWeekdaysAbbrev(route.diasSemana)}
              </Text>
              <Text style={{ color: theme.colors.textMuted, fontSize: 13 }}>
                {nomeMotorista(route.motoristaPadraoId)}
              </Text>
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
  nome: { flex: 1, fontSize: 15, fontWeight: "600" },
});

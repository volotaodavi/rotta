import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import {
  useRoute,
  useRouteStops,
  useRouteStudentsDetalhado,
  useUpdateRoute,
} from "../hooks/use-empresa-routes";

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

type Props = NativeStackScreenProps<EmpresaRotasStackParamList, "Detalhe">;

/**
 * Rotas — detalhe (Frente 4a) — dados da rota + pausar/ativar +
 * paradas e alunos vinculados (leitura). Adicionar parada/aluno entra
 * na Frente 4b, nesta mesma tela.
 */
export function EmpresaRotaDetalheScreen({ route }: Props): JSX.Element {
  const { theme } = useTheme();
  const { routeId } = route.params;
  const { data: rota, isLoading, isError, refetch } = useRoute(routeId);
  const { data: paradas } = useRouteStops(routeId);
  const { data: alunos } = useRouteStudentsDetalhado(routeId);
  const updateRoute = useUpdateRoute(routeId);

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  if (isError || !rota) {
    return (
      <VehicleScreen>
        <Text style={{ color: theme.colors.danger }}>Não foi possível carregar esta rota.</Text>
        <VehicleButton label="Tentar novamente" onPress={() => void refetch()} />
      </VehicleScreen>
    );
  }

  const proximoStatus = rota.status === "ATIVA" ? "PAUSADA" : "ATIVA";

  return (
    <VehicleScreen>
      <VehicleCard style={styles.card}>
        <View style={styles.linha}>
          <Text style={[styles.nome, { color: theme.colors.text }]}>{rota.nome}</Text>
          <StatusPill
            label={ROUTE_STATUS_LABEL[rota.status]}
            tone={ROUTE_STATUS_TONE[rota.status]}
          />
        </View>
        <Text style={{ color: theme.colors.textMuted }}>
          {SCHOOL_SHIFT_LABEL[rota.turno]} · {formatRouteWeekdaysAbbrev(rota.diasSemana)}
        </Text>
        <VehicleButton
          label={rota.status === "ATIVA" ? "Pausar rota" : "Ativar rota"}
          variant="secondary"
          isLoading={updateRoute.isPending}
          onPress={() => updateRoute.mutate({ status: proximoStatus })}
        />
      </VehicleCard>

      <VehicleCard style={styles.card}>
        <Text style={{ color: theme.colors.textMuted, fontWeight: "600", fontSize: 13 }}>
          Paradas
        </Text>
        {!paradas || paradas.length === 0 ? (
          <Text style={{ color: theme.colors.textMuted }}>Nenhuma parada cadastrada ainda.</Text>
        ) : (
          [...paradas]
            .sort((a, b) => a.ordem - b.ordem)
            .map((parada) => (
              <Text key={parada.id} style={{ color: theme.colors.text }}>
                {parada.ordem + 1}. {parada.endereco} · {parada.horarioPrevisto}
              </Text>
            ))
        )}
      </VehicleCard>

      <VehicleCard style={styles.card}>
        <Text style={{ color: theme.colors.textMuted, fontWeight: "600", fontSize: 13 }}>
          Alunos vinculados
        </Text>
        {!alunos || alunos.length === 0 ? (
          <Text style={{ color: theme.colors.textMuted }}>Nenhum aluno vinculado ainda.</Text>
        ) : (
          alunos.map((aluno) => (
            <Text key={aluno.id} style={{ color: theme.colors.text }}>
              {aluno.studentNome ?? "Aluno"}
              {aluno.schoolNome ? ` · ${aluno.schoolNome}` : ""}
            </Text>
          ))
        )}
      </VehicleCard>
    </VehicleScreen>
  );
}

const styles = StyleSheet.create({
  card: { gap: 6 },
  center: { alignItems: "center", flex: 1, justifyContent: "center" },
  linha: { alignItems: "center", flexDirection: "row", gap: 8, justifyContent: "space-between" },
  nome: { flex: 1, fontSize: 17, fontWeight: "700" },
});

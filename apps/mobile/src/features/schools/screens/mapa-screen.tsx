import { ActivityIndicator, StyleSheet, Text, View } from "react-native";


import { useSchool, useSchoolAccessPoints } from "../hooks/use-schools";
import { SCHOOL_ACCESS_POINT_TYPE_LABEL } from "../labels";

import type { VeiculoStackParamList } from "@/navigation/types";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { VehicleCard, VehicleScreen } from "@/features/vehicles/components";
import { useTheme } from "@/providers/theme-provider";

type Props = NativeStackScreenProps<VeiculoStackParamList, "EscolaMapa">;

/**
 * "Mapa" da escola (briefing "MAPA"/"PORTÕES E PONTOS DE EMBARQUE") —
 * `packages/maps` ainda é um stub vazio (mesma decisão de escopo do
 * mapa de `apps/web`/`apps/admin`), então esta tela lista os portões e
 * pontos de embarque/desembarque cadastrados com suas coordenadas; o
 * mapa interativo substitui esta lista assim que o provedor for
 * contratado.
 */
export function EscolaMapaScreen({ route }: Props): JSX.Element {
  const { schoolId } = route.params;
  const { theme } = useTheme();
  const { data: school } = useSchool(schoolId);
  const { data: points, isLoading, isError } = useSchoolAccessPoints(schoolId);

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
        <Text style={{ color: theme.colors.danger }}>
          Não foi possível carregar os pontos de embarque.
        </Text>
      </VehicleScreen>
    );
  }

  return (
    <VehicleScreen>
      <Text style={{ color: theme.colors.textMuted }}>
        Mapa interativo em preparação — nenhum provedor de mapas está configurado ainda. Esta lista
        mostra os portões e pontos de embarque/desembarque de {school?.nomeOficial ?? "esta escola"}
        .
      </Text>

      {!points || points.length === 0 ? (
        <Text style={{ color: theme.colors.textMuted }}>
          Nenhum portão ou ponto de embarque cadastrado ainda.
        </Text>
      ) : (
        points.map((point) => (
          <VehicleCard key={point.id}>
            <Text style={[styles.nome, { color: theme.colors.text }]}>{point.nome}</Text>
            <Text style={{ color: theme.colors.textMuted }}>
              {SCHOOL_ACCESS_POINT_TYPE_LABEL[point.tipo]}
            </Text>
            <Text style={{ color: theme.colors.textMuted }}>
              {point.latitude.toFixed(6)}, {point.longitude.toFixed(6)}
            </Text>
            {point.observacoes ? (
              <Text style={{ color: theme.colors.textMuted }}>{point.observacoes}</Text>
            ) : null}
          </VehicleCard>
        ))
      )}
    </VehicleScreen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center", flex: 1, justifyContent: "center" },
  nome: { fontSize: 15, fontWeight: "700" },
});

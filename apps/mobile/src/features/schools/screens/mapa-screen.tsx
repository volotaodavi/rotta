import { RottaMap, type RottaMapMarker } from "@rotta/maps/native";
import { useMemo } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";


import { useSchool, useSchoolAccessPoints } from "../hooks/use-schools";
import { SCHOOL_ACCESS_POINT_TYPE_LABEL } from "../labels";

import type { VeiculoStackParamList } from "@/navigation/types";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { env } from "@/config/env";
import { VehicleCard, VehicleScreen } from "@/features/vehicles/components";
import { useTheme } from "@/providers/theme-provider";

type Props = NativeStackScreenProps<VeiculoStackParamList, "EscolaMapa">;

/**
 * "Mapa" da escola (briefing "MAPA"/"PORTÕES E PONTOS DE EMBARQUE") —
 * mapa real via `@rotta/maps/native` (Mapbox); quando
 * `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN` não está configurado, cai no
 * fallback de lista (mesma disciplina de `GeoEngineService` no
 * backend — nunca finge um mapa que não pode renderizar).
 */
export function EscolaMapaScreen({ route }: Props): JSX.Element {
  const { schoolId } = route.params;
  const { theme } = useTheme();
  const { data: school } = useSchool(schoolId);
  const { data: points, isLoading, isError } = useSchoolAccessPoints(schoolId);

  const markers = useMemo<RottaMapMarker[]>(
    () =>
      (points ?? []).map((point) => ({
        id: point.id,
        titulo: `${point.nome} (${SCHOOL_ACCESS_POINT_TYPE_LABEL[point.tipo]})`,
        latitude: point.latitude,
        longitude: point.longitude,
      })),
    [points],
  );

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

  if (!points || points.length === 0) {
    return (
      <VehicleScreen>
        <Text style={{ color: theme.colors.textMuted }}>
          Nenhum portão ou ponto de embarque cadastrado ainda em{" "}
          {school?.nomeOficial ?? "esta escola"}.
        </Text>
      </VehicleScreen>
    );
  }

  if (!env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN) {
    return (
      <VehicleScreen>
        <Text style={{ color: theme.colors.textMuted }}>
          Mapa interativo indisponível: EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN não configurado neste
          ambiente. Esta lista mostra os portões e pontos de embarque/desembarque de{" "}
          {school?.nomeOficial ?? "esta escola"}.
        </Text>
        {points.map((point) => (
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
        ))}
      </VehicleScreen>
    );
  }

  return (
    <View style={styles.mapContainer}>
      <RottaMap accessToken={env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN} markers={markers} />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center", flex: 1, justifyContent: "center" },
  mapContainer: { flex: 1 },
  nome: { fontSize: 15, fontWeight: "700" },
});

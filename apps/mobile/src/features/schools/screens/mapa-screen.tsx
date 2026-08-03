import { RottaMap, type RottaMapMarker } from "@rotta/maps/native";
import { useMemo } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";


import { useSchool, useSchoolAccessPoints } from "../hooks/use-schools";
import { SCHOOL_ACCESS_POINT_TYPE_LABEL } from "../labels";

import type { VeiculoStackParamList } from "@/navigation/types";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { VehicleScreen } from "@/features/vehicles/components";
import { useTheme } from "@/providers/theme-provider";

type Props = NativeStackScreenProps<VeiculoStackParamList, "EscolaMapa">;

/** "Mapa" da escola (briefing "MAPA"/"PORTÕES E PONTOS DE EMBARQUE") — mapa real via `@rotta/maps/native` (MapLibre/OpenStreetMap, sem token). */
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

  return (
    <View style={styles.mapContainer}>
      <RottaMap markers={markers} />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center", flex: 1, justifyContent: "center" },
  mapContainer: { flex: 1 },
});

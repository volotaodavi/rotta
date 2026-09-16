import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { useUpdateVehicleStatus, useVehicle } from "../hooks/use-empresa-vehicles";

import type { EmpresaFrotaStackParamList } from "@/navigation/types";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { VehicleStatus } from "@rotta/api-client";

import {
  StatusPill,
  VehicleButton,
  VehicleCard,
  VehicleScreen,
} from "@/features/vehicles/components";
import {
  VEHICLE_STATUS_LABEL,
  VEHICLE_STATUS_TONE,
  VEHICLE_TYPE_LABEL,
} from "@/features/vehicles/labels";
import { useTheme } from "@/providers/theme-provider";

type Props = NativeStackScreenProps<EmpresaFrotaStackParamList, "Detalhe">;

const TODOS_OS_STATUS = Object.keys(VEHICLE_STATUS_LABEL) as VehicleStatus[];

/**
 * Frota — detalhe — dados do veículo + seletor de status (chips,
 * mesmo truque de `novo-chamado-screen.tsx`) + atalhos pra Documentos
 * (Frente 3b) e, desde a Frente C (12/09/2026 — "traga o que tem na
 * Web pro app"), as 6 abas que só existiam em
 * `apps/web/.../veiculos/[id]`: Manutenção, Lembretes, Vínculos,
 * Checklist, Ocorrências e Histórico (auditoria).
 */
export function EmpresaVeiculoDetalheScreen({ route, navigation }: Props): JSX.Element {
  const { theme } = useTheme();
  const { vehicleId } = route.params;
  const { data: vehicle, isLoading, isError, refetch } = useVehicle(vehicleId);
  const updateStatus = useUpdateVehicleStatus(vehicleId);

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  if (isError || !vehicle) {
    return (
      <VehicleScreen>
        <Text style={{ color: theme.colors.danger }}>Não foi possível carregar este veículo.</Text>
        <VehicleButton label="Tentar novamente" onPress={() => void refetch()} />
      </VehicleScreen>
    );
  }

  return (
    <VehicleScreen>
      <VehicleCard style={styles.card}>
        <View style={styles.linha}>
          <Text style={[styles.placa, { color: theme.colors.text }]}>{vehicle.placa}</Text>
          <StatusPill
            label={VEHICLE_STATUS_LABEL[vehicle.status]}
            tone={VEHICLE_STATUS_TONE[vehicle.status]}
          />
        </View>
        <Text style={{ color: theme.colors.textMuted }}>
          {vehicle.modelo}
          {vehicle.marca ? ` · ${vehicle.marca}` : ""}
          {vehicle.ano ? ` · ${vehicle.ano}` : ""}
        </Text>
        <Text style={{ color: theme.colors.textMuted, fontSize: 14 }}>
          {VEHICLE_TYPE_LABEL[vehicle.tipo]} · {vehicle.capacidadePassageiros} passageiros
          {vehicle.cor ? ` · ${vehicle.cor}` : ""}
        </Text>
      </VehicleCard>

      <VehicleCard style={styles.card}>
        <Text style={{ color: theme.colors.textMuted, fontWeight: "600", fontSize: 14 }}>
          Status
        </Text>
        <View style={styles.chips}>
          {TODOS_OS_STATUS.map((status) => (
            <VehicleButton
              key={status}
              label={VEHICLE_STATUS_LABEL[status]}
              variant={vehicle.status === status ? "primary" : "secondary"}
              isLoading={updateStatus.isPending && updateStatus.variables === status}
              onPress={() => updateStatus.mutate(status)}
            />
          ))}
        </View>
      </VehicleCard>

      <VehicleButton
        label="Documentos"
        variant="secondary"
        onPress={() => navigation.navigate("Documentos", { vehicleId })}
      />
      <VehicleButton
        label="Manutenção"
        variant="secondary"
        onPress={() => navigation.navigate("Manutencoes", { vehicleId })}
      />
      <VehicleButton
        label="Lembretes"
        variant="secondary"
        onPress={() => navigation.navigate("Lembretes", { vehicleId })}
      />
      <VehicleButton
        label="Vínculos"
        variant="secondary"
        onPress={() => navigation.navigate("Vinculos", { vehicleId })}
      />
      <VehicleButton
        label="Checklist"
        variant="secondary"
        onPress={() => navigation.navigate("Checklist", { vehicleId })}
      />
      <VehicleButton
        label="Ocorrências"
        variant="secondary"
        onPress={() => navigation.navigate("Ocorrencias", { vehicleId })}
      />
      <VehicleButton
        label="Histórico"
        variant="secondary"
        onPress={() => navigation.navigate("Auditoria", { vehicleId })}
      />
    </VehicleScreen>
  );
}

const styles = StyleSheet.create({
  card: { gap: 6 },
  center: { alignItems: "center", flex: 1, justifyContent: "center" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  linha: { alignItems: "center", flexDirection: "row", gap: 8, justifyContent: "space-between" },
  placa: { fontSize: 20, fontWeight: "700", letterSpacing: 0.5 },
});

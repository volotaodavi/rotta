import { ActivityIndicator, Image, StyleSheet, Text, View } from "react-native";


import { StatusPill, VehicleButton, VehicleCard, VehicleScreen } from "../components";
import { useMyVehicle } from "../hooks/use-vehicles";
import { VEHICLE_STATUS_LABEL, VEHICLE_STATUS_TONE, VEHICLE_TYPE_LABEL } from "../labels";

import type { VeiculoStackParamList } from "@/navigation/types";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { useTheme } from "@/providers/theme-provider";

type Props = NativeStackScreenProps<VeiculoStackParamList, "MeuVeiculo">;

/**
 * "Meu Veículo" (briefing "APP MOBILE") — ponto de entrada do Motorista/
 * Monitor para tudo relacionado ao veículo atualmente vinculado a ele
 * (`GET /vehicles/me`, Dossiê 13 §RBAC: 404/`null` quando não há vínculo
 * ativo, nunca os dados de outro veículo). Os atalhos abaixo levam às
 * demais telas desta stack — todas operando sobre o mesmo veículo.
 */
export function MeuVeiculoScreen({ navigation }: Props): JSX.Element {
  const { theme } = useTheme();
  const { data: vehicle, isLoading, isError } = useMyVehicle();

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
          Não foi possível carregar seu veículo. Tente novamente mais tarde.
        </Text>
      </VehicleScreen>
    );
  }

  if (!vehicle) {
    return (
      <VehicleScreen>
        <Text style={{ color: theme.colors.textMuted }}>
          Você ainda não está vinculado a nenhum veículo. Fale com sua empresa.
        </Text>
      </VehicleScreen>
    );
  }

  return (
    <VehicleScreen>
      <VehicleCard>
        {vehicle.fotoUrl ? (
          <Image source={{ uri: vehicle.fotoUrl }} style={styles.photo} resizeMode="cover" />
        ) : null}
        <View style={styles.headerRow}>
          <Text style={[styles.placa, { color: theme.colors.text }]}>{vehicle.placa}</Text>
          <StatusPill
            label={VEHICLE_STATUS_LABEL[vehicle.status]}
            tone={VEHICLE_STATUS_TONE[vehicle.status]}
          />
        </View>
        <Text style={{ color: theme.colors.textMuted }}>
          {vehicle.modelo} {vehicle.marca ? `— ${vehicle.marca}` : ""} ·{" "}
          {VEHICLE_TYPE_LABEL[vehicle.tipo]}
        </Text>
        <Text style={{ color: theme.colors.textMuted }}>
          Capacidade: {vehicle.capacidadePassageiros} passageiros ·{" "}
          {vehicle.quilometragemAtual.toLocaleString("pt-BR")} km
        </Text>
      </VehicleCard>

      <View style={styles.actions}>
        <VehicleButton
          label="Fotos"
          variant="secondary"
          onPress={() => navigation.navigate("Fotos")}
        />
        <VehicleButton
          label="Documentos"
          variant="secondary"
          onPress={() => navigation.navigate("Documentos")}
        />
        <VehicleButton
          label="Histórico de manutenções"
          variant="secondary"
          onPress={() => navigation.navigate("Historico")}
        />
        <VehicleButton
          label="Ocorrências"
          variant="secondary"
          onPress={() => navigation.navigate("Ocorrencias")}
        />
        <VehicleButton
          label="Checklist de viagem"
          onPress={() => navigation.navigate("Checklist")}
        />
        <VehicleButton
          label="Escolas atendidas"
          variant="secondary"
          onPress={() => navigation.navigate("Escolas")}
        />
      </View>
    </VehicleScreen>
  );
}

const styles = StyleSheet.create({
  actions: { gap: 12 },
  center: { alignItems: "center", flex: 1, justifyContent: "center" },
  headerRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  photo: { borderRadius: 8, height: 160, width: "100%" },
  placa: { fontSize: 20, fontWeight: "700" },
});

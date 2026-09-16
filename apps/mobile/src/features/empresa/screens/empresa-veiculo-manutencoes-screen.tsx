import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import type { EmpresaFrotaStackParamList } from "@/navigation/types";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { VehicleMaintenanceType } from "@rotta/api-client";

import {
  VehicleButton,
  VehicleCard,
  VehicleScreen,
  VehicleTextField,
} from "@/features/vehicles/components";
import {
  useCreateVehicleMaintenance,
  useVehicleMaintenances,
} from "@/features/vehicles/hooks/use-vehicles";
import { VEHICLE_MAINTENANCE_TYPE_LABEL } from "@/features/vehicles/labels";
import { useTheme } from "@/providers/theme-provider";

type Props = NativeStackScreenProps<EmpresaFrotaStackParamList, "Manutencoes">;

const TIPOS = Object.keys(VEHICLE_MAINTENANCE_TYPE_LABEL) as VehicleMaintenanceType[];

/**
 * "Manutenção" (Frente C — abas que faltavam no detalhe do veículo,
 * pedido do usuário 12/09/2026: "traga o que tem na Web pro app").
 * Mirror de `ManutencoesTab` em
 * `apps/web/.../veiculos/[id]/vehicle-detail-client.tsx` — registrar +
 * histórico, sem edição/remoção (mesma decisão da Web).
 */
export function EmpresaVeiculoManutencoesScreen({ route }: Props): JSX.Element {
  const { theme } = useTheme();
  const { vehicleId } = route.params;
  const { data } = useVehicleMaintenances(vehicleId);
  const createMaintenance = useCreateVehicleMaintenance(vehicleId);

  const [tipo, setTipo] = useState<VehicleMaintenanceType>("TROCA_OLEO");
  const [data_, setData] = useState("");
  const [quilometragem, setQuilometragem] = useState("");
  const [fornecedor, setFornecedor] = useState("");

  function handleRegistrar(): void {
    if (!data_) return;
    createMaintenance.mutate(
      {
        tipo,
        data: data_,
        quilometragem: quilometragem ? Number(quilometragem) : undefined,
        fornecedor: fornecedor || undefined,
      },
      {
        onSuccess: () => {
          setData("");
          setQuilometragem("");
          setFornecedor("");
        },
      },
    );
  }

  return (
    <VehicleScreen>
      <VehicleCard style={styles.card}>
        <Text style={{ color: theme.colors.textMuted, fontWeight: "600", fontSize: 14 }}>
          Registrar manutenção
        </Text>
        <View style={styles.chips}>
          {TIPOS.map((value) => (
            <VehicleButton
              key={value}
              label={VEHICLE_MAINTENANCE_TYPE_LABEL[value]}
              variant={tipo === value ? "primary" : "secondary"}
              onPress={() => setTipo(value)}
            />
          ))}
        </View>
        <VehicleTextField
          label="Data (AAAA-MM-DD)"
          value={data_}
          onChangeText={setData}
          placeholder="ex: 2026-03-01"
        />
        <VehicleTextField
          label="Quilometragem (opcional)"
          value={quilometragem}
          onChangeText={setQuilometragem}
          keyboardType="number-pad"
        />
        <VehicleTextField
          label="Fornecedor (opcional)"
          value={fornecedor}
          onChangeText={setFornecedor}
        />
        <VehicleButton
          label="Registrar"
          disabled={!data_}
          isLoading={createMaintenance.isPending}
          onPress={handleRegistrar}
        />
      </VehicleCard>

      {!data || data.items.length === 0 ? (
        <Text style={{ color: theme.colors.textMuted }}>Nenhuma manutenção registrada ainda.</Text>
      ) : (
        data.items.map((m) => (
          <VehicleCard key={m.id} style={styles.card}>
            <Text style={{ color: theme.colors.text, fontWeight: "600" }}>
              {VEHICLE_MAINTENANCE_TYPE_LABEL[m.tipo]}
            </Text>
            <Text style={{ color: theme.colors.textMuted, fontSize: 14 }}>
              {new Date(m.data).toLocaleDateString("pt-BR")}
              {m.quilometragem ? ` · ${m.quilometragem.toLocaleString("pt-BR")} km` : ""}
            </Text>
            {m.fornecedor ? (
              <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>{m.fornecedor}</Text>
            ) : null}
          </VehicleCard>
        ))
      )}
    </VehicleScreen>
  );
}

const styles = StyleSheet.create({
  card: { gap: 8 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
});

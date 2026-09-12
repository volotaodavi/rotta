import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";


import type { EmpresaFrotaStackParamList } from "@/navigation/types";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { VehicleReminderType } from "@rotta/api-client";

import {
  StatusPill,
  VehicleButton,
  VehicleCard,
  VehicleScreen,
  VehicleTextField,
} from "@/features/vehicles/components";
import {
  useCreateVehicleReminder,
  useUpdateVehicleReminderStatus,
  useVehicleReminders,
} from "@/features/vehicles/hooks/use-vehicles";
import { VEHICLE_REMINDER_TYPE_LABEL } from "@/features/vehicles/labels";
import { useTheme } from "@/providers/theme-provider";

type Props = NativeStackScreenProps<EmpresaFrotaStackParamList, "Lembretes">;

const TIPOS = Object.keys(VEHICLE_REMINDER_TYPE_LABEL) as VehicleReminderType[];

/**
 * "Lembretes" (Frente C) — mirror de `LembretesTab` em
 * `apps/web/.../veiculos/[id]/vehicle-detail-client.tsx`: criar lembrete
 * (licenciamento/seguro/revisão/etc. numa data-alvo) + marcar concluído.
 */
export function EmpresaVeiculoLembretesScreen({ route }: Props): JSX.Element {
  const { theme } = useTheme();
  const { vehicleId } = route.params;
  const { data: reminders } = useVehicleReminders(vehicleId);
  const createReminder = useCreateVehicleReminder(vehicleId);
  const updateStatus = useUpdateVehicleReminderStatus(vehicleId);

  const [tipo, setTipo] = useState<VehicleReminderType>("REVISAO");
  const [dataAlvo, setDataAlvo] = useState("");

  function handleCriar(): void {
    if (!dataAlvo) return;
    createReminder.mutate({ tipo, dataAlvo }, { onSuccess: () => setDataAlvo("") });
  }

  return (
    <VehicleScreen>
      <VehicleCard style={styles.card}>
        <Text style={{ color: theme.colors.textMuted, fontWeight: "600", fontSize: 13 }}>
          Novo lembrete
        </Text>
        <View style={styles.chips}>
          {TIPOS.map((value) => (
            <VehicleButton
              key={value}
              label={VEHICLE_REMINDER_TYPE_LABEL[value]}
              variant={tipo === value ? "primary" : "secondary"}
              onPress={() => setTipo(value)}
            />
          ))}
        </View>
        <VehicleTextField
          label="Data-alvo (AAAA-MM-DD)"
          value={dataAlvo}
          onChangeText={setDataAlvo}
          placeholder="ex: 2026-06-01"
        />
        <VehicleButton
          label="Criar lembrete"
          disabled={!dataAlvo}
          isLoading={createReminder.isPending}
          onPress={handleCriar}
        />
      </VehicleCard>

      {!reminders || reminders.length === 0 ? (
        <Text style={{ color: theme.colors.textMuted }}>Nenhum lembrete cadastrado ainda.</Text>
      ) : (
        reminders.map((r) => (
          <VehicleCard key={r.id} style={styles.card}>
            <View style={styles.linha}>
              <Text style={{ color: theme.colors.text, fontWeight: "600" }}>
                {VEHICLE_REMINDER_TYPE_LABEL[r.tipo]}
              </Text>
              <StatusPill
                label={r.vencido ? "Vencido" : r.vencendo ? "Vencendo" : r.status}
                tone={r.vencido ? "danger" : r.vencendo ? "warning" : "neutral"}
              />
            </View>
            <Text style={{ color: theme.colors.textMuted, fontSize: 13 }}>
              Data-alvo: {new Date(r.dataAlvo).toLocaleDateString("pt-BR")}
            </Text>
            {r.status === "PENDENTE" ? (
              <VehicleButton
                label="Marcar concluído"
                variant="secondary"
                isLoading={updateStatus.isPending && updateStatus.variables?.reminderId === r.id}
                onPress={() => updateStatus.mutate({ reminderId: r.id, status: "CONCLUIDO" })}
              />
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
  linha: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
});

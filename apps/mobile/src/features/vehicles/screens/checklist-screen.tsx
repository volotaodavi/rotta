import { useState } from "react";
import { StyleSheet, Switch, Text, View } from "react-native";


import { VehicleButton, VehicleCard, VehicleScreen, VehicleTextField } from "../components";
import {
  useCreateVehicleChecklist,
  useMyVehicle,
  useVehicleChecklists,
} from "../hooks/use-vehicles";

import { useTheme } from "@/providers/theme-provider";

const ITEMS: {
  key: "pneusOk" | "lucesOk" | "combustivelOk" | "limpezaOk" | "equipamentosObrigatoriosOk";
  label: string;
}[] = [
  { key: "pneusOk", label: "Pneus" },
  { key: "lucesOk", label: "Luzes" },
  { key: "combustivelOk", label: "Combustível" },
  { key: "limpezaOk", label: "Limpeza" },
  { key: "equipamentosObrigatoriosOk", label: "Equipamentos obrigatórios" },
];

const INITIAL_STATE = {
  pneusOk: true,
  lucesOk: true,
  combustivelOk: true,
  limpezaOk: true,
  equipamentosObrigatoriosOk: true,
};

/**
 * Checklist de viagem (briefing "CHECKLIST") — opcional, preenchido pelo
 * próprio Motorista antes da viagem (`POST /vehicles/:id/checklists`,
 * exclusivo do papel Motorista, Dossiê 13: "sempre usa o ator
 * autenticado como motorista, nunca o body"). Histórico sempre
 * preservado, sem edição/exclusão.
 */
export function ChecklistScreen(): JSX.Element {
  const { theme } = useTheme();
  const { data: vehicle } = useMyVehicle();
  const { data: checklists } = useVehicleChecklists(vehicle?.id);
  const createChecklist = useCreateVehicleChecklist(vehicle?.id);

  const [form, setForm] = useState(INITIAL_STATE);
  const [observacoes, setObservacoes] = useState("");

  function handleSubmit(): void {
    createChecklist.mutate(
      { ...form, observacoes: observacoes.trim() || undefined },
      {
        onSuccess: () => {
          setForm(INITIAL_STATE);
          setObservacoes("");
        },
      },
    );
  }

  return (
    <VehicleScreen>
      <VehicleCard>
        <Text style={[styles.title, { color: theme.colors.text }]}>Novo checklist</Text>
        {ITEMS.map((item) => (
          <View key={item.key} style={styles.switchRow}>
            <Text style={{ color: theme.colors.text }}>{item.label}</Text>
            <Switch
              value={form[item.key]}
              onValueChange={(value) => setForm((current) => ({ ...current, [item.key]: value }))}
              trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
            />
          </View>
        ))}
        <VehicleTextField
          label="Observações"
          value={observacoes}
          onChangeText={setObservacoes}
          multiline
          numberOfLines={3}
        />
        <VehicleButton
          label="Registrar checklist"
          onPress={handleSubmit}
          isLoading={createChecklist.isPending}
        />
      </VehicleCard>

      {checklists?.items.length === 0 ? (
        <Text style={{ color: theme.colors.textMuted }}>Nenhum checklist registrado ainda.</Text>
      ) : null}

      {checklists?.items.map((checklist) => (
        <VehicleCard key={checklist.id}>
          <Text style={{ color: theme.colors.textMuted }}>
            {new Date(checklist.createdAt).toLocaleString("pt-BR")}
          </Text>
          <Text style={{ color: theme.colors.text }}>
            {ITEMS.filter((item) => !checklist[item.key])
              .map((item) => item.label)
              .join(", ") || "Tudo OK"}
          </Text>
          {checklist.observacoes ? (
            <Text style={{ color: theme.colors.textMuted }}>{checklist.observacoes}</Text>
          ) : null}
        </VehicleCard>
      ))}
    </VehicleScreen>
  );
}

const styles = StyleSheet.create({
  switchRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  title: { fontSize: 15, fontWeight: "700" },
});

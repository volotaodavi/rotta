import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";


import {
  StatusPill,
  VehicleButton,
  VehicleCard,
  VehicleScreen,
  VehicleTextField,
} from "../components";
import {
  useCreateVehicleOccurrence,
  useMyVehicle,
  useVehicleOccurrences,
} from "../hooks/use-vehicles";
import { VEHICLE_OCCURRENCE_SEVERITY_LABEL, VEHICLE_OCCURRENCE_SEVERITY_TONE } from "../labels";

import { useTheme } from "@/providers/theme-provider";

/**
 * Ocorrências do veículo (briefing "APP MOBILE") — único fluxo de
 * escrita desta stack aberto a Motorista/Monitor além do Checklist
 * (`POST /vehicles/:id/occurrences` aceita `EMPRESA, GESTOR, MOTORISTA,
 * MONITOR`, Dossiê 13). Severidade default `BAIXA` no backend quando
 * omitida — aqui sempre enviamos `MEDIA` como ponto de partida neutro
 * para o motorista ajustar.
 */
export function OcorrenciasScreen(): JSX.Element {
  const { theme } = useTheme();
  const { data: vehicle } = useMyVehicle();
  const { data: occurrences } = useVehicleOccurrences(vehicle?.id);
  const createOccurrence = useCreateVehicleOccurrence(vehicle?.id);

  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function handleSubmit(): void {
    if (!titulo.trim() || !descricao.trim()) {
      setErrorMessage("Preencha título e descrição.");
      return;
    }
    setErrorMessage(null);
    createOccurrence.mutate(
      { titulo: titulo.trim(), descricao: descricao.trim(), severidade: "MEDIA" },
      {
        onSuccess: () => {
          setTitulo("");
          setDescricao("");
        },
        onError: () => setErrorMessage("Não foi possível registrar a ocorrência. Tente novamente."),
      },
    );
  }

  return (
    <VehicleScreen>
      <VehicleCard>
        <Text style={[styles.title, { color: theme.colors.text }]}>Reportar ocorrência</Text>
        <VehicleTextField label="Título" value={titulo} onChangeText={setTitulo} />
        <VehicleTextField
          label="Descrição"
          value={descricao}
          onChangeText={setDescricao}
          multiline
          numberOfLines={3}
        />
        {errorMessage ? <Text style={{ color: theme.colors.danger }}>{errorMessage}</Text> : null}
        <VehicleButton
          label="Reportar"
          onPress={handleSubmit}
          isLoading={createOccurrence.isPending}
        />
      </VehicleCard>

      {occurrences?.items.length === 0 ? (
        <Text style={{ color: theme.colors.textMuted }}>Nenhuma ocorrência reportada ainda.</Text>
      ) : null}

      {occurrences?.items.map((occurrence) => (
        <VehicleCard key={occurrence.id}>
          <View style={styles.headerRow}>
            <Text style={[styles.title, { color: theme.colors.text }]}>{occurrence.titulo}</Text>
            <StatusPill
              label={VEHICLE_OCCURRENCE_SEVERITY_LABEL[occurrence.severidade]}
              tone={VEHICLE_OCCURRENCE_SEVERITY_TONE[occurrence.severidade]}
            />
          </View>
          <Text style={{ color: theme.colors.textMuted }}>{occurrence.descricao}</Text>
          <Text style={{ color: theme.colors.textMuted }}>
            {new Date(occurrence.createdAt).toLocaleString("pt-BR")}
          </Text>
        </VehicleCard>
      ))}
    </VehicleScreen>
  );
}

const styles = StyleSheet.create({
  headerRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  title: { fontSize: 15, fontWeight: "700" },
});

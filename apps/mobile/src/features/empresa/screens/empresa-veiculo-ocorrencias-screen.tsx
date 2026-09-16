import { useState } from "react";
import { Text } from "react-native";

import type { EmpresaFrotaStackParamList } from "@/navigation/types";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import {
  StatusPill,
  VehicleButton,
  VehicleCard,
  VehicleScreen,
  VehicleTextField,
} from "@/features/vehicles/components";
import {
  useCreateVehicleOccurrence,
  useVehicleOccurrences,
} from "@/features/vehicles/hooks/use-vehicles";
import {
  VEHICLE_OCCURRENCE_SEVERITY_LABEL,
  VEHICLE_OCCURRENCE_SEVERITY_TONE,
} from "@/features/vehicles/labels";
import { useTheme } from "@/providers/theme-provider";

type Props = NativeStackScreenProps<EmpresaFrotaStackParamList, "Ocorrencias">;

/**
 * "Ocorrências" (Frente C) — mirror de `OcorrenciasTab`: mesmo endpoint
 * já usado do lado Motorista (`RegistrarOcorrenciaButton` em
 * `inicio-screen.tsx`), agora também acessível pela Empresa/Gestor —
 * reportar + ver o histórico completo do veículo.
 */
export function EmpresaVeiculoOcorrenciasScreen({ route }: Props): JSX.Element {
  const { theme } = useTheme();
  const { vehicleId } = route.params;
  const { data } = useVehicleOccurrences(vehicleId);
  const createOccurrence = useCreateVehicleOccurrence(vehicleId);

  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");

  function handleReportar(): void {
    if (!titulo || !descricao) return;
    createOccurrence.mutate(
      { titulo, descricao },
      {
        onSuccess: () => {
          setTitulo("");
          setDescricao("");
        },
      },
    );
  }

  return (
    <VehicleScreen>
      <VehicleCard style={{ gap: 8 }}>
        <Text style={{ color: theme.colors.textMuted, fontWeight: "600", fontSize: 14 }}>
          Reportar ocorrência
        </Text>
        <VehicleTextField label="Título" value={titulo} onChangeText={setTitulo} />
        <VehicleTextField
          label="Descrição"
          value={descricao}
          onChangeText={setDescricao}
          multiline
        />
        <VehicleButton
          label="Reportar"
          disabled={!titulo || !descricao}
          isLoading={createOccurrence.isPending}
          onPress={handleReportar}
        />
      </VehicleCard>

      {!data || data.items.length === 0 ? (
        <Text style={{ color: theme.colors.textMuted }}>Nenhuma ocorrência registrada ainda.</Text>
      ) : (
        data.items.map((o) => (
          <VehicleCard key={o.id} style={{ gap: 4 }}>
            <StatusPill
              label={VEHICLE_OCCURRENCE_SEVERITY_LABEL[o.severidade]}
              tone={VEHICLE_OCCURRENCE_SEVERITY_TONE[o.severidade]}
            />
            <Text style={{ color: theme.colors.text, fontWeight: "600" }}>{o.titulo}</Text>
            <Text style={{ color: theme.colors.textMuted, fontSize: 14 }}>{o.descricao}</Text>
            <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>
              {new Date(o.createdAt).toLocaleString("pt-BR")}
            </Text>
          </VehicleCard>
        ))
      )}
    </VehicleScreen>
  );
}

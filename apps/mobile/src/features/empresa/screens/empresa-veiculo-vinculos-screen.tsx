import { ApiError } from "@rotta/api-client";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { useMyTeam } from "../hooks/use-empresa-team";

import type { EmpresaFrotaStackParamList } from "@/navigation/types";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { VehicleAssignmentRole } from "@rotta/api-client";

import { VehicleButton, VehicleCard, VehicleScreen } from "@/features/vehicles/components";
import {
  useAssignVehicle,
  useVehicleAssignmentHistory,
} from "@/features/vehicles/hooks/use-vehicles";
import { useTheme } from "@/providers/theme-provider";

type Props = NativeStackScreenProps<EmpresaFrotaStackParamList, "Vinculos">;

const PAPEL_LABEL: Record<VehicleAssignmentRole, string> = {
  MOTORISTA: "Motorista",
  MONITOR: "Monitor",
};

/**
 * "Vínculos" (Frente C) — mirror de `VinculosTab` em
 * `apps/web/.../veiculos/[id]/vehicle-detail-client.tsx`: vincular
 * motorista/monitor a este veículo + histórico (nunca apagado, só
 * encerrado — "um veículo poderá ser utilizado por diferentes
 * motoristas ao longo do tempo"). A Web ainda pede um "ID do usuário"
 * digitado — aqui o membro é escolhido por nome, reaproveitando
 * `useMyTeam()` (mesmo hook já usado em Equipe), mesma melhoria já
 * aplicada em "Gerar contrato" (Frente A).
 */
export function EmpresaVeiculoVinculosScreen({ route }: Props): JSX.Element {
  const { theme } = useTheme();
  const { vehicleId } = route.params;
  const { data: history } = useVehicleAssignmentHistory(vehicleId);
  const { data: team } = useMyTeam();
  const assign = useAssignVehicle(vehicleId);

  const [papel, setPapel] = useState<VehicleAssignmentRole>("MOTORISTA");
  const [userId, setUserId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const candidatos = (team ?? []).filter(
    (m) => m.papel === (papel === "MOTORISTA" ? "motorista" : "monitor"),
  );

  function handleVincular(): void {
    if (!userId) return;
    setErrorMessage(null);
    assign.mutate(
      { papel, userId },
      {
        onSuccess: () => setUserId(null),
        onError: (error) =>
          setErrorMessage(error instanceof ApiError ? error.message : "Erro ao vincular."),
      },
    );
  }

  return (
    <VehicleScreen>
      <VehicleCard style={styles.card}>
        <Text style={{ color: theme.colors.textMuted, fontWeight: "600", fontSize: 14 }}>
          Vincular motorista/monitor
        </Text>
        <View style={styles.chips}>
          {(Object.keys(PAPEL_LABEL) as VehicleAssignmentRole[]).map((value) => (
            <VehicleButton
              key={value}
              label={PAPEL_LABEL[value]}
              variant={papel === value ? "primary" : "secondary"}
              onPress={() => {
                setPapel(value);
                setUserId(null);
              }}
            />
          ))}
        </View>
        {candidatos.length === 0 ? (
          <Text style={{ color: theme.colors.textMuted, fontSize: 14 }}>
            Nenhum {PAPEL_LABEL[papel].toLowerCase()} com vínculo ativo nesta empresa ainda.
          </Text>
        ) : (
          <View style={styles.chips}>
            {candidatos.map((membro) => (
              <VehicleButton
                key={membro.userId}
                label={membro.nome}
                variant={userId === membro.userId ? "primary" : "secondary"}
                onPress={() => setUserId(membro.userId)}
              />
            ))}
          </View>
        )}
        {errorMessage ? (
          <Text style={{ color: theme.colors.danger, fontSize: 14 }}>{errorMessage}</Text>
        ) : null}
        <VehicleButton
          label="Vincular"
          disabled={!userId}
          isLoading={assign.isPending}
          onPress={handleVincular}
        />
      </VehicleCard>

      <Text style={{ color: theme.colors.textMuted, fontWeight: "600", fontSize: 14 }}>
        Histórico
      </Text>
      {!history || history.length === 0 ? (
        <Text style={{ color: theme.colors.textMuted }}>Nenhum vínculo registrado ainda.</Text>
      ) : (
        history.map((a) => (
          <VehicleCard key={a.id} style={styles.card}>
            <Text style={{ color: theme.colors.text, fontWeight: "600" }}>
              {PAPEL_LABEL[a.papel]}
            </Text>
            <Text style={{ color: theme.colors.textMuted, fontSize: 14 }}>
              Desde {new Date(a.iniciadoEm).toLocaleDateString("pt-BR")}
              {a.encerradoEm
                ? ` até ${new Date(a.encerradoEm).toLocaleDateString("pt-BR")}`
                : " (atual)"}
            </Text>
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

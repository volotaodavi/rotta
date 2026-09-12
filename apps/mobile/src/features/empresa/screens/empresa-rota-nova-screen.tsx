import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { useCreateRoute } from "../hooks/use-empresa-routes";

import type { EmpresaRotasStackParamList } from "@/navigation/types";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RouteWeekday, SchoolShift } from "@rotta/api-client";

import { ROUTE_WEEKDAY_LABEL } from "@/features/routes/labels";
import { SCHOOL_SHIFT_LABEL } from "@/features/schools/labels";
import {
  VehicleButton,
  VehicleCard,
  VehicleScreen,
  VehicleTextField,
} from "@/features/vehicles/components";
import { useTheme } from "@/providers/theme-provider";

type Props = NativeStackScreenProps<EmpresaRotasStackParamList, "Novo">;

const TURNOS = Object.keys(SCHOOL_SHIFT_LABEL) as SchoolShift[];
const DIAS = Object.keys(ROUTE_WEEKDAY_LABEL) as RouteWeekday[];

/**
 * Rotas — cadastro (Frente 4b) — formulário único, sem wizard
 * multi-tela (nome + turno + dias da semana). Veículo/motorista/monitor
 * padrão ficam de fora da v1 (opcionais no backend; adicionados depois
 * na tela de detalhe, junto com paradas e alunos).
 */
export function EmpresaRotaNovaScreen({ navigation }: Props): JSX.Element {
  const { theme } = useTheme();
  const createRoute = useCreateRoute();

  const [nome, setNome] = useState("");
  const [turno, setTurno] = useState<SchoolShift | null>(null);
  const [diasSemana, setDiasSemana] = useState<RouteWeekday[]>([]);
  const [error, setError] = useState<string | null>(null);

  function toggleDia(dia: RouteWeekday): void {
    setDiasSemana((atual) =>
      atual.includes(dia) ? atual.filter((item) => item !== dia) : [...atual, dia],
    );
  }

  function handleSubmit(): void {
    if (nome.trim().length < 2 || !turno || diasSemana.length === 0) {
      setError("Preencha o nome, o turno e pelo menos um dia da semana.");
      return;
    }
    setError(null);
    createRoute.mutate(
      { nome: nome.trim(), turno, diasSemana },
      {
        onSuccess: (rota) => {
          navigation.replace("Detalhe", { routeId: rota.id });
        },
        onError: () => {
          setError("Não foi possível cadastrar a rota. Tente novamente.");
        },
      },
    );
  }

  return (
    <VehicleScreen>
      <VehicleTextField label="Nome da rota" value={nome} onChangeText={setNome} />

      <VehicleCard style={styles.card}>
        <Text style={{ color: theme.colors.textMuted, fontWeight: "600", fontSize: 13 }}>
          Turno
        </Text>
        <View style={styles.chips}>
          {TURNOS.map((value) => (
            <VehicleButton
              key={value}
              label={SCHOOL_SHIFT_LABEL[value]}
              variant={turno === value ? "primary" : "secondary"}
              onPress={() => setTurno(value)}
            />
          ))}
        </View>
      </VehicleCard>

      <VehicleCard style={styles.card}>
        <Text style={{ color: theme.colors.textMuted, fontWeight: "600", fontSize: 13 }}>
          Dias da semana
        </Text>
        <View style={styles.chips}>
          {DIAS.map((value) => (
            <VehicleButton
              key={value}
              label={ROUTE_WEEKDAY_LABEL[value]}
              variant={diasSemana.includes(value) ? "primary" : "secondary"}
              onPress={() => toggleDia(value)}
            />
          ))}
        </View>
      </VehicleCard>

      {error ? <Text style={{ color: theme.colors.danger }}>{error}</Text> : null}

      <VehicleButton
        label="Cadastrar rota"
        onPress={handleSubmit}
        isLoading={createRoute.isPending}
      />
    </VehicleScreen>
  );
}

const styles = StyleSheet.create({
  card: { gap: 8 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
});

import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { useSchool } from "../hooks/use-schools";
import { SCHOOL_SHIFT_LABEL } from "../labels";

import type { VeiculoStackParamList } from "@/navigation/types";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { VehicleCard, VehicleScreen } from "@/features/vehicles/components";
import { useTheme } from "@/providers/theme-provider";

type Props = NativeStackScreenProps<VeiculoStackParamList, "EscolaHorarios">;

/**
 * "Horários" (briefing "APP MOBILE"/"TURNOS") — mostra os turnos que a
 * escola atende (`School.turnosAtendidos`). Horários granulares por
 * rota (ex. "07h20 na Rua X") dependem do módulo de Rotas, que ainda
 * não existe (mesmo gap honestamente divulgado em
 * `rotas-vinculadas-screen.tsx`) — os turnos aqui são o dado real mais
 * próximo disponível hoje.
 */
export function EscolaHorariosScreen({ route }: Props): JSX.Element {
  const { schoolId } = route.params;
  const { theme } = useTheme();
  const { data: school, isLoading, isError } = useSchool(schoolId);

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  if (isError || !school) {
    return (
      <VehicleScreen>
        <Text style={{ color: theme.colors.danger }}>Não foi possível carregar os horários.</Text>
      </VehicleScreen>
    );
  }

  return (
    <VehicleScreen>
      <VehicleCard>
        <Text style={[styles.titulo, { color: theme.colors.text }]}>
          Turnos atendidos por {school.nomeOficial}
        </Text>
        {school.turnosAtendidos.map((turno) => (
          <Text key={turno} style={{ color: theme.colors.textMuted }}>
            • {SCHOOL_SHIFT_LABEL[turno]}
          </Text>
        ))}
      </VehicleCard>
      <Text style={{ color: theme.colors.textMuted }}>
        Horários detalhados por rota (ex. horário de embarque em cada ponto) dependem do módulo de
        Rotas, ainda não implementado.
      </Text>
    </VehicleScreen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center", flex: 1, justifyContent: "center" },
  titulo: { fontSize: 15, fontWeight: "700" },
});

import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { useSchool } from "../hooks/use-schools";
import {
  SCHOOL_ADMINISTRATIVE_DEPENDENCY_LABEL,
  SCHOOL_TYPE_LABEL,
  SCHOOL_STATUS_LABEL,
  SCHOOL_STATUS_TONE,
} from "../labels";

import type { VeiculoStackParamList } from "@/navigation/types";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import {
  StatusPill,
  VehicleButton,
  VehicleCard,
  VehicleScreen,
} from "@/features/vehicles/components";
import { useTheme } from "@/providers/theme-provider";

type Props = NativeStackScreenProps<VeiculoStackParamList, "EscolaDetalhes">;

/**
 * Detalhes da escola (briefing "APP MOBILE"/"CADASTRO"/"ENDEREÇO"/
 * "TIPOS") — somente leitura, com atalhos para Mapa/Rotas
 * vinculadas/Horários (as outras 3 telas pedidas no briefing).
 */
export function EscolaDetalhesScreen({ route, navigation }: Props): JSX.Element {
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
        <Text style={{ color: theme.colors.danger }}>Não foi possível carregar esta escola.</Text>
      </VehicleScreen>
    );
  }

  return (
    <VehicleScreen>
      <VehicleCard>
        <View style={styles.headerRow}>
          <Text style={[styles.nome, { color: theme.colors.text }]}>{school.nomeOficial}</Text>
          <StatusPill
            label={SCHOOL_STATUS_LABEL[school.status]}
            tone={SCHOOL_STATUS_TONE[school.status]}
          />
        </View>
        {school.nomeFantasia ? (
          <Text style={{ color: theme.colors.textMuted }}>{school.nomeFantasia}</Text>
        ) : null}
        <Text style={{ color: theme.colors.textMuted }}>
          {SCHOOL_ADMINISTRATIVE_DEPENDENCY_LABEL[school.dependenciaAdministrativa]} ·{" "}
          {school.tipos.map((tipo) => SCHOOL_TYPE_LABEL[tipo]).join(", ")}
        </Text>
        <Text style={{ color: theme.colors.textMuted }}>
          {school.logradouro}, {school.numero}, {school.bairro}, {school.cidade}/{school.estado}
        </Text>
        {school.observacoesLocalizacao ? (
          <Text style={{ color: theme.colors.textMuted }}>{school.observacoesLocalizacao}</Text>
        ) : null}
      </VehicleCard>

      <View style={styles.actions}>
        <VehicleButton
          label="Mapa e pontos de embarque"
          variant="secondary"
          onPress={() => navigation.navigate("EscolaMapa", { schoolId })}
        />
        <VehicleButton
          label="Rotas vinculadas"
          variant="secondary"
          onPress={() => navigation.navigate("EscolaRotasVinculadas", { schoolId })}
        />
        <VehicleButton
          label="Horários"
          variant="secondary"
          onPress={() => navigation.navigate("EscolaHorarios", { schoolId })}
        />
      </View>
    </VehicleScreen>
  );
}

const styles = StyleSheet.create({
  actions: { gap: 12 },
  center: { alignItems: "center", flex: 1, justifyContent: "center" },
  headerRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  nome: { flexShrink: 1, fontSize: 18, fontWeight: "700" },
});

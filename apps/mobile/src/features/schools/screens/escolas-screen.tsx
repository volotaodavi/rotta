import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";


import { useSchoolsList } from "../hooks/use-schools";
import { SCHOOL_STATUS_LABEL, SCHOOL_STATUS_TONE } from "../labels";

import type { VeiculoStackParamList } from "@/navigation/types";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import {
  StatusPill,
  VehicleButton,
  VehicleCard,
  VehicleScreen,
} from "@/features/vehicles/components";
import { useTheme } from "@/providers/theme-provider";

type Props = NativeStackScreenProps<VeiculoStackParamList, "Escolas">;

/**
 * "Escolas" (briefing "APP MOBILE" do módulo Escolas) — lista as
 * escolas atualmente vinculadas às rotas do Motorista/Monitor
 * autenticado. Somente leitura (briefing "PERMISSÕES") — reutiliza
 * `VehicleCard`/`VehicleScreen`/`StatusPill` de `features/vehicles`
 * (componentes genéricos de UI, sem lógica de veículo) em vez de
 * duplicá-los.
 */
export function EscolasScreen({ navigation }: Props): JSX.Element {
  const { theme } = useTheme();
  const { data, isLoading, isError, refetch } = useSchoolsList();

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
          Não foi possível carregar as escolas. Tente novamente mais tarde.
        </Text>
        <VehicleButton label="Tentar novamente" onPress={() => void refetch()} />
      </VehicleScreen>
    );
  }

  if (!data || data.items.length === 0) {
    return (
      <VehicleScreen>
        <Text style={{ color: theme.colors.textMuted }}>
          Nenhuma escola vinculada às suas rotas ainda.
        </Text>
      </VehicleScreen>
    );
  }

  return (
    <VehicleScreen>
      {data.items.map((school) => (
        <Pressable
          key={school.id}
          onPress={() => navigation.navigate("EscolaDetalhes", { schoolId: school.id })}
        >
          <VehicleCard>
            <Text style={[styles.nome, { color: theme.colors.text }]}>{school.nomeOficial}</Text>
            <Text style={{ color: theme.colors.textMuted }}>
              {school.cidade}/{school.estado}
            </Text>
            <StatusPill
              label={SCHOOL_STATUS_LABEL[school.status]}
              tone={SCHOOL_STATUS_TONE[school.status]}
            />
          </VehicleCard>
        </Pressable>
      ))}
    </VehicleScreen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center", flex: 1, justifyContent: "center" },
  nome: { fontSize: 16, fontWeight: "700" },
});

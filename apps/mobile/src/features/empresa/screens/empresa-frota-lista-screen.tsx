import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { useVehiclesList } from "../hooks/use-empresa-vehicles";

import type { EmpresaFrotaStackParamList } from "@/navigation/types";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import {
  StatusPill,
  VehicleButton,
  VehicleCard,
  VehicleScreen,
  VehicleTextField,
} from "@/features/vehicles/components";
import { VEHICLE_STATUS_LABEL, VEHICLE_STATUS_TONE } from "@/features/vehicles/labels";
import { useTheme } from "@/providers/theme-provider";

type Props = NativeStackScreenProps<EmpresaFrotaStackParamList, "Lista">;

/**
 * Frota — listagem (Frente 3a, Empresa/Gestor reduzida) — espelha
 * `apps/web/.../veiculos/page.tsx` em escopo reduzido: busca por
 * texto + lista, sem os cards de métrica/export (fica pra Web). Página
 * única com `pageSize: 100` (sem paginação real — ver raciocínio no
 * plano da Frente).
 *
 * "Ver frota no mapa" (Frente B, 12/09/2026) — atalho pro localizador
 * em tempo real, equivalente a `apps/web/.../veiculos/mapa/page.tsx`.
 */
export function EmpresaFrotaListaScreen({ navigation }: Props): JSX.Element {
  const { theme } = useTheme();
  const [search, setSearch] = useState("");
  const [searchAplicado, setSearchAplicado] = useState("");
  const { data, isLoading, isError, refetch } = useVehiclesList({
    pageSize: 100,
    search: searchAplicado || undefined,
  });

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
        <Text style={{ color: theme.colors.danger }}>Não foi possível carregar a frota.</Text>
        <VehicleButton label="Tentar novamente" onPress={() => void refetch()} />
      </VehicleScreen>
    );
  }

  return (
    <VehicleScreen>
      <View style={styles.searchRow}>
        <View style={styles.searchField}>
          <VehicleTextField
            label="Buscar"
            value={search}
            onChangeText={setSearch}
            placeholder="Placa ou modelo"
            onSubmitEditing={() => setSearchAplicado(search)}
            returnKeyType="search"
          />
        </View>
        <VehicleButton
          label="Buscar"
          variant="secondary"
          onPress={() => setSearchAplicado(search)}
        />
      </View>

      <VehicleButton label="+ Novo veículo" onPress={() => navigation.navigate("Novo")} />
      <VehicleButton
        label="Ver frota no mapa"
        variant="secondary"
        onPress={() => navigation.navigate("Mapa")}
      />

      {!data || data.items.length === 0 ? (
        <Text style={{ color: theme.colors.textMuted }}>Nenhum veículo cadastrado ainda.</Text>
      ) : (
        data.items.map((vehicle) => (
          <Pressable
            key={vehicle.id}
            onPress={() => navigation.navigate("Detalhe", { vehicleId: vehicle.id })}
          >
            <VehicleCard>
              <View style={styles.linha}>
                <Text style={[styles.placa, { color: theme.colors.text }]}>{vehicle.placa}</Text>
                <StatusPill
                  label={VEHICLE_STATUS_LABEL[vehicle.status]}
                  tone={VEHICLE_STATUS_TONE[vehicle.status]}
                />
              </View>
              <Text style={{ color: theme.colors.textMuted, fontSize: 13 }}>
                {vehicle.modelo}
                {vehicle.marca ? ` · ${vehicle.marca}` : ""}
              </Text>
            </VehicleCard>
          </Pressable>
        ))
      )}
    </VehicleScreen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center", flex: 1, justifyContent: "center" },
  linha: { alignItems: "center", flexDirection: "row", gap: 8, justifyContent: "space-between" },
  placa: { fontSize: 15, fontWeight: "700", letterSpacing: 0.5 },
  searchField: { flex: 1 },
  searchRow: { alignItems: "flex-end", flexDirection: "row", gap: 8 },
});

import { Bus, ChevronRight } from "@rotta/icons/native";
import { EmptyState, ListRow } from "@rotta/ui/native";
import { useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { useVehiclesList } from "../hooks/use-empresa-vehicles";

import type { EmpresaFrotaStackParamList } from "@/navigation/types";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { Texto } from "@/components/texto";
import {
  StatusPill,
  VehicleButton,
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
        <Texto style={{ color: theme.colors.danger }}>Não foi possível carregar a frota.</Texto>
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
        <EmptyState
          title="Nenhum veículo cadastrado"
          description="Cadastre o primeiro veículo para vincular motorista, rota e documentos."
          icon={<Bus size={28} color={theme.colors.primary} />}
          theme={theme}
        />
      ) : (
        /*
          Um veículo por linha com selo, placa e estado, como na tela 30
          do conceito. Antes cada veículo era um cartão com a placa numa
          linha e o modelo em outra, o que dava uma pilha alta onde a
          frota inteira não cabia na tela.
        */
        <View style={styles.lista}>
          {data.items.map((vehicle) => (
            <ListRow
              key={vehicle.id}
              rotulo={vehicle.placa}
              descricao={`${vehicle.modelo}${vehicle.marca ? ` · ${vehicle.marca}` : ""}`}
              icon={<Bus size={20} color={theme.colors.primary} />}
              onPress={() => navigation.navigate("Detalhe", { vehicleId: vehicle.id })}
              acessorio={
                <View style={styles.acessorio}>
                  <StatusPill
                    label={VEHICLE_STATUS_LABEL[vehicle.status]}
                    tone={VEHICLE_STATUS_TONE[vehicle.status]}
                  />
                  <ChevronRight size={18} color={theme.colors.textMuted} />
                </View>
              }
              comoCartao
              theme={theme}
            />
          ))}
        </View>
      )}
    </VehicleScreen>
  );
}

const styles = StyleSheet.create({
  acessorio: { alignItems: "center", flexDirection: "row", gap: 8 },
  center: { alignItems: "center", flex: 1, justifyContent: "center" },
  lista: { gap: 8 },
  searchField: { flex: 1 },
  searchRow: { alignItems: "flex-end", flexDirection: "row", gap: 8 },
});

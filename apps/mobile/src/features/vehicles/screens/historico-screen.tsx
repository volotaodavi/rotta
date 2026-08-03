import { StyleSheet, Text } from "react-native";


import { VehicleCard, VehicleScreen } from "../components";
import { useMyVehicle, useVehicleMaintenances } from "../hooks/use-vehicles";
import { VEHICLE_MAINTENANCE_TYPE_LABEL } from "../labels";

import { useTheme } from "@/providers/theme-provider";

function centsToBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/**
 * Histórico de manutenções do veículo (briefing "MANUTENÇÃO"/"APP
 * MOBILE") — somente leitura para Motorista/Monitor (registrar
 * manutenção é exclusivo de Empresa/Gestor). Histórico nunca é apagado
 * (Dossiê 13 §Vinculação — mesmo princípio de preservação aplicado a
 * manutenções).
 */
export function HistoricoScreen(): JSX.Element {
  const { theme } = useTheme();
  const { data: vehicle } = useMyVehicle();
  const { data: maintenances } = useVehicleMaintenances(vehicle?.id);

  if (maintenances && maintenances.items.length === 0) {
    return (
      <VehicleScreen>
        <Text style={{ color: theme.colors.textMuted }}>
          Nenhuma manutenção registrada para este veículo.
        </Text>
      </VehicleScreen>
    );
  }

  return (
    <VehicleScreen>
      {maintenances?.items.map((maintenance) => (
        <VehicleCard key={maintenance.id}>
          <Text style={[styles.tipo, { color: theme.colors.text }]}>
            {VEHICLE_MAINTENANCE_TYPE_LABEL[maintenance.tipo]}
          </Text>
          <Text style={{ color: theme.colors.textMuted }}>
            {new Date(maintenance.data).toLocaleDateString("pt-BR")}
            {maintenance.quilometragem
              ? ` · ${maintenance.quilometragem.toLocaleString("pt-BR")} km`
              : ""}
          </Text>
          {maintenance.valorCentavos ? (
            <Text style={{ color: theme.colors.textMuted }}>
              {centsToBRL(maintenance.valorCentavos)}
            </Text>
          ) : null}
          {maintenance.fornecedor ? (
            <Text style={{ color: theme.colors.textMuted }}>
              Fornecedor: {maintenance.fornecedor}
            </Text>
          ) : null}
          {maintenance.observacoes ? (
            <Text style={{ color: theme.colors.textMuted }}>{maintenance.observacoes}</Text>
          ) : null}
        </VehicleCard>
      ))}
    </VehicleScreen>
  );
}

const styles = StyleSheet.create({
  tipo: { fontSize: 15, fontWeight: "700" },
});

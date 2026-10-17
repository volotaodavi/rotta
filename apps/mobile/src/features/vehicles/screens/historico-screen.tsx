import { formatarCentavos } from "@rotta/utils";
import { StyleSheet } from "react-native";

import { VehicleCard, VehicleScreen } from "../components";
import { useMyVehicle, useVehicleMaintenances } from "../hooks/use-vehicles";
import { VEHICLE_MAINTENANCE_TYPE_LABEL } from "../labels";

import { Texto } from "@/components/texto";
import { useTheme } from "@/providers/theme-provider";

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
        <Texto style={{ color: theme.colors.textMuted }}>
          Nenhuma manutenção registrada para este veículo.
        </Texto>
      </VehicleScreen>
    );
  }

  return (
    <VehicleScreen>
      {maintenances?.items.map((maintenance) => (
        <VehicleCard key={maintenance.id}>
          <Texto style={[styles.tipo, { color: theme.colors.text }]}>
            {VEHICLE_MAINTENANCE_TYPE_LABEL[maintenance.tipo]}
          </Texto>
          <Texto style={{ color: theme.colors.textMuted }}>
            {new Date(maintenance.data).toLocaleDateString("pt-BR")}
            {maintenance.quilometragem
              ? ` · ${maintenance.quilometragem.toLocaleString("pt-BR")} km`
              : ""}
          </Texto>
          {maintenance.valorCentavos ? (
            <Texto style={{ color: theme.colors.textMuted }}>
              {formatarCentavos(maintenance.valorCentavos)}
            </Texto>
          ) : null}
          {maintenance.fornecedor ? (
            <Texto style={{ color: theme.colors.textMuted }}>
              Fornecedor: {maintenance.fornecedor}
            </Texto>
          ) : null}
          {maintenance.observacoes ? (
            <Texto style={{ color: theme.colors.textMuted }}>{maintenance.observacoes}</Texto>
          ) : null}
        </VehicleCard>
      ))}
    </VehicleScreen>
  );
}

const styles = StyleSheet.create({
  tipo: { fontSize: 16, fontWeight: "700" },
});

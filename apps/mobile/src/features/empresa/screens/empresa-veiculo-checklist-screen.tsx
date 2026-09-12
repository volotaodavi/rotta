import { Text } from "react-native";


import type { EmpresaFrotaStackParamList } from "@/navigation/types";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { VehicleChecklist } from "@rotta/api-client";

import { VehicleCard, VehicleScreen } from "@/features/vehicles/components";
import { useVehicleChecklists } from "@/features/vehicles/hooks/use-vehicles";
import { useTheme } from "@/providers/theme-provider";

type Props = NativeStackScreenProps<EmpresaFrotaStackParamList, "Checklist">;

/**
 * "Checklist" (Frente C) — mirror de `ChecklistTab`: só leitura, o
 * checklist é registrado pelo próprio Motorista antes de cada viagem
 * (`vehicles/screens/checklist-screen.tsx`, do lado do Motorista) —
 * aqui a Empresa/Gestor só acompanha.
 */
export function EmpresaVeiculoChecklistScreen({ route }: Props): JSX.Element {
  const { theme } = useTheme();
  const { vehicleId } = route.params;
  const { data } = useVehicleChecklists(vehicleId);

  function Item({ label, ok }: { label: string; ok: boolean }): JSX.Element {
    return (
      <Text style={{ color: ok ? theme.colors.textMuted : theme.colors.danger, fontSize: 13 }}>
        {label}: {ok ? "OK" : "Problema"}
      </Text>
    );
  }

  return (
    <VehicleScreen>
      {!data || data.items.length === 0 ? (
        <Text style={{ color: theme.colors.textMuted }}>
          Nenhum checklist registrado pelo motorista ainda.
        </Text>
      ) : (
        data.items.map((c: VehicleChecklist) => (
          <VehicleCard key={c.id} style={{ gap: 6 }}>
            <Text style={{ color: theme.colors.text, fontWeight: "600" }}>
              {new Date(c.createdAt).toLocaleString("pt-BR")}
            </Text>
            <Item label="Pneus" ok={c.pneusOk} />
            <Item label="Luzes" ok={c.lucesOk} />
            <Item label="Combustível" ok={c.combustivelOk} />
            <Item label="Limpeza" ok={c.limpezaOk} />
            <Item label="Equipamentos obrigatórios" ok={c.equipamentosObrigatoriosOk} />
            {c.observacoes ? (
              <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>
                Observações: {c.observacoes}
              </Text>
            ) : null}
          </VehicleCard>
        ))
      )}
    </VehicleScreen>
  );
}

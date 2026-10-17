import {} from "react-native";

import { History } from "@rotta/icons/native";
import { EmptyState } from "@rotta/ui/native";

import type { EmpresaFrotaStackParamList } from "@/navigation/types";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { Texto } from "@/components/texto";
import { VehicleCard, VehicleScreen } from "@/features/vehicles/components";
import { useVehicleAuditLogs } from "@/features/vehicles/hooks/use-vehicles";
import { useTheme } from "@/providers/theme-provider";

type Props = NativeStackScreenProps<EmpresaFrotaStackParamList, "Auditoria">;

/**
 * "Histórico" (auditoria, Frente C) — mirror de `AuditoriaTab`: só
 * leitura, mudanças registradas neste veículo (status, documentos,
 * vínculos) — cada linha já vem com uma descrição pronta (`log.acao`),
 * nada é reconstruído aqui a partir de `dadosAntes`/`dadosDepois`.
 */
export function EmpresaVeiculoAuditoriaScreen({ route }: Props): JSX.Element {
  const { theme } = useTheme();
  const { vehicleId } = route.params;
  const { data } = useVehicleAuditLogs(vehicleId);

  return (
    <VehicleScreen>
      {!data || data.items.length === 0 ? (
        <EmptyState
          title="Nenhuma alteração registrada"
          description="Toda mudança neste veículo passa a aparecer aqui, com autor e data."
          icon={<History size={28} color={theme.colors.primary} />}
          theme={theme}
        />
      ) : (
        data.items.map((log) => (
          <VehicleCard key={log.id} style={{ gap: 4 }}>
            <Texto style={{ color: theme.colors.text, fontWeight: "600" }}>{log.acao}</Texto>
            <Texto style={{ color: theme.colors.textMuted, fontSize: 12 }}>
              {new Date(log.createdAt).toLocaleString("pt-BR")}
            </Texto>
          </VehicleCard>
        ))
      )}
    </VehicleScreen>
  );
}

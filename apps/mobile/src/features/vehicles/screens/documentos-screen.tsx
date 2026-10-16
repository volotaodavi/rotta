import { StyleSheet } from "react-native";

import { StatusPill, VehicleCard, VehicleScreen } from "../components";
import { useMyVehicle, useVehicleDocuments } from "../hooks/use-vehicles";
import {
  VEHICLE_DOCUMENT_AI_STATUS_LABEL,
  VEHICLE_DOCUMENT_AI_STATUS_TONE,
  VEHICLE_DOCUMENT_TYPE_LABEL,
} from "../labels";

import { Texto } from "@/components/texto";
import { useTheme } from "@/providers/theme-provider";

/**
 * Documentos do veículo (briefing "DOCUMENTAÇÃO"/"APP MOBILE") —
 * somente leitura para Motorista/Monitor (upload é exclusivo de
 * Empresa/Gestor, mesma nota de `fotos-screen.tsx`). Mostra o status da
 * análise da Rotta AI e o vencimento de cada documento.
 */
export function DocumentosScreen(): JSX.Element {
  const { theme } = useTheme();
  const { data: vehicle } = useMyVehicle();
  const { data: documents } = useVehicleDocuments(vehicle?.id);

  if (documents && documents.length === 0) {
    return (
      <VehicleScreen>
        <Texto style={{ color: theme.colors.textMuted }}>
          Nenhum documento cadastrado para este veículo.
        </Texto>
      </VehicleScreen>
    );
  }

  return (
    <VehicleScreen>
      {documents?.map((doc) => (
        <VehicleCard key={doc.id}>
          <Texto style={[styles.tipo, { color: theme.colors.text }]}>
            {VEHICLE_DOCUMENT_TYPE_LABEL[doc.tipo]}
          </Texto>
          <Texto style={{ color: theme.colors.textMuted }}>{doc.nomeOriginal}</Texto>
          {doc.vencimentoEm ? (
            <Texto style={{ color: theme.colors.textMuted }}>
              Vencimento: {new Date(doc.vencimentoEm).toLocaleDateString("pt-BR")}
            </Texto>
          ) : null}
          <StatusPill
            label={VEHICLE_DOCUMENT_AI_STATUS_LABEL[doc.rottaAiStatus]}
            tone={VEHICLE_DOCUMENT_AI_STATUS_TONE[doc.rottaAiStatus]}
          />
        </VehicleCard>
      ))}
    </VehicleScreen>
  );
}

const styles = StyleSheet.create({
  tipo: { fontSize: 16, fontWeight: "700" },
});

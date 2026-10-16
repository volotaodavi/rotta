import { Image, StyleSheet } from "react-native";

import { VehicleCard, VehicleScreen } from "../components";
import { useMyVehicle, useVehicleDocuments } from "../hooks/use-vehicles";

import { Texto } from "@/components/texto";
import { useTheme } from "@/providers/theme-provider";

/**
 * Fotos do veículo (briefing "APP MOBILE") — somente leitura para
 * Motorista/Monitor: a foto principal e os documentos do tipo `FOTO`
 * são enviados por Empresa/Gestor (Dossiê 13 §RBAC — `POST /vehicles/:id/
 * photo` e `POST /vehicles/:id/documents` exigem papel de gestão), nunca
 * pelo próprio motorista.
 */
export function FotosScreen(): JSX.Element {
  const { theme } = useTheme();
  const { data: vehicle } = useMyVehicle();
  const { data: documents } = useVehicleDocuments(vehicle?.id);
  const fotos = documents?.filter((doc) => doc.tipo === "FOTO") ?? [];

  return (
    <VehicleScreen>
      {vehicle?.fotoUrl ? (
        <VehicleCard>
          <Texto style={[styles.label, { color: theme.colors.textMuted }]}>Foto principal</Texto>
          <Image source={{ uri: vehicle.fotoUrl }} style={styles.photo} resizeMode="cover" />
        </VehicleCard>
      ) : null}

      {fotos.length === 0 && !vehicle?.fotoUrl ? (
        <Texto style={{ color: theme.colors.textMuted }}>
          Nenhuma foto cadastrada para este veículo.
        </Texto>
      ) : null}

      {fotos.map((doc) => (
        <VehicleCard key={doc.id}>
          <Image source={{ uri: doc.fileUrl }} style={styles.photo} resizeMode="cover" />
          <Texto style={{ color: theme.colors.textMuted }}>
            Enviada em {new Date(doc.createdAt).toLocaleDateString("pt-BR")}
          </Texto>
        </VehicleCard>
      ))}
    </VehicleScreen>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 12, fontWeight: "600" },
  photo: { borderRadius: 8, height: 200, width: "100%" },
});

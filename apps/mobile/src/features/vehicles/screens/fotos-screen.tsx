import { Image, StyleSheet, Text } from "react-native";

import { VehicleCard, VehicleScreen } from "../components";
import { useMyVehicle, useVehicleDocuments } from "../hooks/use-vehicles";

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
          <Text style={[styles.label, { color: theme.colors.textMuted }]}>Foto principal</Text>
          <Image source={{ uri: vehicle.fotoUrl }} style={styles.photo} resizeMode="cover" />
        </VehicleCard>
      ) : null}

      {fotos.length === 0 && !vehicle?.fotoUrl ? (
        <Text style={{ color: theme.colors.textMuted }}>
          Nenhuma foto cadastrada para este veículo.
        </Text>
      ) : null}

      {fotos.map((doc) => (
        <VehicleCard key={doc.id}>
          <Image source={{ uri: doc.fileUrl }} style={styles.photo} resizeMode="cover" />
          <Text style={{ color: theme.colors.textMuted }}>
            Enviada em {new Date(doc.createdAt).toLocaleDateString("pt-BR")}
          </Text>
        </VehicleCard>
      ))}
    </VehicleScreen>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 12, fontWeight: "600" },
  photo: { borderRadius: 8, height: 200, width: "100%" },
});

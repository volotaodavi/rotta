import { StyleSheet, Text, View } from "react-native";

import type { TransporterCard as TransporterCardData } from "@rotta/api-client";

import { StatusPill, VehicleCard } from "@/features/vehicles/components";
import { useTheme } from "@/providers/theme-provider";


/** Cartão de transportador na busca (briefing "Marketplace" §"TRANSPORTADORES"). */
export function TransporterCard({
  transportador,
}: {
  transportador: TransporterCardData;
}): JSX.Element {
  const { theme } = useTheme();

  return (
    <VehicleCard>
      <View style={styles.header}>
        <Text style={[styles.nome, { color: theme.colors.text }]}>
          {transportador.nomeFantasia}
        </Text>
        {transportador.verificado ? <StatusPill label="Verificado" tone="success" /> : null}
      </View>

      <Text style={{ color: theme.colors.textMuted }}>
        {transportador.distanciaKm.toFixed(1)} km de distância
      </Text>

      <View style={styles.row}>
        <Text style={{ color: theme.colors.textMuted }}>
          {transportador.avaliacaoMedia !== null
            ? `★ ${transportador.avaliacaoMedia.toFixed(1)} (${transportador.totalAvaliacoes})`
            : "Sem avaliações ainda"}
        </Text>
        <Text style={{ color: theme.colors.textMuted }}>
          {transportador.veiculosAtivos} veículo(s)
        </Text>
        <Text style={{ color: theme.colors.textMuted }}>
          {transportador.alunosTransportados} aluno(s)
        </Text>
      </View>

      <Text style={[styles.mensalidade, { color: theme.colors.primary }]}>
        {transportador.mensalidadeAPartirDeCentavos !== null
          ? `A partir de R$ ${(transportador.mensalidadeAPartirDeCentavos / 100).toFixed(2)}/mês`
          : "Consulte a mensalidade"}
      </Text>
    </VehicleCard>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  mensalidade: { fontWeight: "600" },
  nome: { fontSize: 16, fontWeight: "700" },
  row: { flexDirection: "row", gap: 12 },
});

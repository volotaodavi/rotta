import { ChevronRight, Star } from "@rotta/icons/native";
import { StyleSheet, Text, View } from "react-native";

import type { TransporterCard as TransporterCardData } from "@rotta/api-client";

import { StatusPill, VehicleCard } from "@/features/vehicles/components";
import { VEHICLE_CATEGORY_LABEL, VEHICLE_CATEGORY_TONE } from "@/features/vehicles/labels";
import { useTheme } from "@/providers/theme-provider";

/**
 * Cartão de transportador na busca (briefing "Marketplace"
 * §"TRANSPORTADORES") — perfil profissional, nunca um item de compra:
 * o CTA é sempre "Conhecer empresa" (Prompt "UX/UI Master do
 * Marketplace" — "nada de Comprar, nada de linguagem de marketplace"),
 * nunca "Contratar"/"Comprar"/"Adicionar". O card inteiro já é
 * clicável (`Pressable` de quem chama, `mapa-screen.tsx`) — o CTA aqui
 * é só o afordance visual, não um toque separado.
 */
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

      {/* Modalidade real da frota (Dossiê 45 — CATEGORIA B ≠ TRANSPORTE ESCOLAR):
          nunca inferida da categoria da CNH de um motorista, sempre da frota
          declarada em `Vehicle.categoria`. */}
      <View style={styles.modalidades}>
        {transportador.categoriasVeiculo.length > 0 ? (
          transportador.categoriasVeiculo.map((categoria) => (
            <StatusPill
              key={categoria}
              label={VEHICLE_CATEGORY_LABEL[categoria]}
              tone={VEHICLE_CATEGORY_TONE[categoria]}
            />
          ))
        ) : (
          <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>
            Modalidade não informada
          </Text>
        )}
      </View>

      <View style={styles.row}>
        {transportador.avaliacaoMedia !== null ? (
          <View style={styles.avaliacao}>
            <Star size={13} color={theme.colors.textMuted} fill={theme.colors.textMuted} />
            <Text style={{ color: theme.colors.textMuted }}>
              {transportador.avaliacaoMedia.toFixed(1)} ({transportador.totalAvaliacoes})
            </Text>
          </View>
        ) : (
          <Text style={{ color: theme.colors.textMuted }}>Sem avaliações ainda</Text>
        )}
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

      <View style={[styles.cta, { borderColor: theme.colors.border }]}>
        <Text style={[styles.ctaLabel, { color: theme.colors.primary }]}>Conhecer empresa</Text>
        <ChevronRight size={16} color={theme.colors.primary} />
      </View>
    </VehicleCard>
  );
}

const styles = StyleSheet.create({
  avaliacao: { alignItems: "center", flexDirection: "row", gap: 4 },
  cta: {
    alignItems: "center",
    borderTopWidth: 1,
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 4,
    paddingTop: 8,
  },
  ctaLabel: { fontSize: 13, fontWeight: "700" },
  header: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  mensalidade: { fontWeight: "600" },
  modalidades: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  nome: { fontSize: 16, fontWeight: "700" },
  row: { alignItems: "center", flexDirection: "row", gap: 12 },
});

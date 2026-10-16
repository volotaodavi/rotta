import { ChevronRight, Star } from "@rotta/icons/native";
import { StyleSheet, View } from "react-native";

import type { TransporterCard as TransporterCardData } from "@rotta/api-client";

import { Texto } from "@/components/texto";
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
        <Texto style={[styles.nome, { color: theme.colors.text }]}>
          {transportador.nomeFantasia}
        </Texto>
        {transportador.verificado ? <StatusPill label="Verificado" tone="success" /> : null}
      </View>

      <Texto style={{ color: theme.colors.textMuted }}>
        {transportador.distanciaKm.toFixed(1)} km de distância
      </Texto>

      {/* Modalidade real da frota (Dossiê 45 — CATEGORIA B ≠ TRANSPORTE ESCOLAR):
          nunca inferida da categoria da CNH de um motorista, sempre da frota
          declarada em `Vehicle.categoria`. O badge ESCOLAR distingue
          "declarado pela empresa" de "verificado" (achado C1 da auditoria
          Legal↔Produto) — nunca deixar o Responsável ler os dois como a
          mesma garantia. */}
      <View style={styles.modalidades}>
        {transportador.categoriasVeiculo.length > 0 ? (
          transportador.categoriasVeiculo.map((categoria) =>
            categoria === "ESCOLAR" ? (
              <StatusPill
                key={categoria}
                label={
                  transportador.escolarVerificado
                    ? "Transporte escolar (verificado)"
                    : "Transporte escolar (não verificado)"
                }
                tone={transportador.escolarVerificado ? "success" : "warning"}
              />
            ) : (
              <StatusPill
                key={categoria}
                label={VEHICLE_CATEGORY_LABEL[categoria]}
                tone={VEHICLE_CATEGORY_TONE[categoria]}
              />
            ),
          )
        ) : (
          <Texto style={{ color: theme.colors.textMuted, fontSize: 12 }}>
            Modalidade não informada
          </Texto>
        )}
      </View>

      <View style={styles.row}>
        {transportador.avaliacaoMedia !== null ? (
          <View style={styles.avaliacao}>
            <Star size={13} color={theme.colors.textMuted} fill={theme.colors.textMuted} />
            <Texto style={{ color: theme.colors.textMuted }}>
              {transportador.avaliacaoMedia.toFixed(1)} ({transportador.totalAvaliacoes})
            </Texto>
          </View>
        ) : (
          <Texto style={{ color: theme.colors.textMuted }}>Sem avaliações ainda</Texto>
        )}
        <Texto style={{ color: theme.colors.textMuted }}>
          {transportador.veiculosAtivos} veículo(s)
        </Texto>
        <Texto style={{ color: theme.colors.textMuted }}>
          {transportador.alunosTransportados} aluno(s)
        </Texto>
      </View>

      <Texto style={[styles.mensalidade, { color: theme.colors.primary }]}>
        {transportador.mensalidadeAPartirDeCentavos !== null
          ? `A partir de R$ ${(transportador.mensalidadeAPartirDeCentavos / 100).toFixed(2)}/mês`
          : "Consulte a mensalidade"}
      </Texto>

      <View style={[styles.cta, { borderColor: theme.colors.border }]}>
        <Texto style={[styles.ctaLabel, { color: theme.colors.primary }]}>Conhecer empresa</Texto>
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
  ctaLabel: { fontSize: 14, fontWeight: "700" },
  header: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  mensalidade: { fontWeight: "600" },
  modalidades: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  nome: { fontSize: 16, fontWeight: "700" },
  row: { alignItems: "center", flexDirection: "row", gap: 12 },
});

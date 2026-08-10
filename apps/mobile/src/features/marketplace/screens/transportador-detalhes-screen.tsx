import { Star } from "@rotta/icons/native";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";


import { useTransporterDetail } from "../hooks/use-transporters";

import type { MarketplaceStackParamList } from "@/navigation/types";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import {
  StatusPill,
  VehicleButton,
  VehicleCard,
  VehicleScreen,
} from "@/features/vehicles/components";
import { useTheme } from "@/providers/theme-provider";

type Props = NativeStackScreenProps<MarketplaceStackParamList, "TransportadorDetalhes">;

/**
 * Detalhes do transportador (briefing "Marketplace" §"DETALHES DO
 * TRANSPORTADOR") — dados completos além do cartão de busca (endereço,
 * contato, avaliações recentes) e o botão "Solicitar Transporte" que
 * abre `SolicitarTransporteScreen` para o mesmo transportador.
 */
export function TransportadorDetalhesScreen({ route, navigation }: Props): JSX.Element {
  const { theme } = useTheme();
  const { transportadorId } = route.params;
  const { data, isLoading, isError } = useTransporterDetail(transportadorId);

  if (isLoading) {
    return (
      <VehicleScreen>
        <ActivityIndicator color={theme.colors.primary} />
      </VehicleScreen>
    );
  }

  if (isError || !data) {
    return (
      <VehicleScreen>
        <Text style={{ color: theme.colors.danger }}>
          Não foi possível carregar os dados deste transportador.
        </Text>
      </VehicleScreen>
    );
  }

  return (
    <VehicleScreen>
      <View style={styles.header}>
        <Text style={[styles.nome, { color: theme.colors.text }]}>{data.nomeFantasia}</Text>
        {data.verificado ? <StatusPill label="Verificado" tone="success" /> : null}
      </View>
      <Text style={{ color: theme.colors.textMuted }}>{data.razaoSocial}</Text>
      <Text style={{ color: theme.colors.textMuted }}>
        {data.cidade}/{data.estado} — {data.distanciaKm.toFixed(1)} km de distância
      </Text>

      <VehicleCard>
        {data.avaliacaoMedia !== null ? (
          <View style={styles.avaliacao}>
            <Star size={14} color={theme.colors.text} fill={theme.colors.text} />
            <Text style={{ color: theme.colors.text }}>
              {data.avaliacaoMedia.toFixed(1)} ({data.totalAvaliacoes} avaliações)
            </Text>
          </View>
        ) : (
          <Text style={{ color: theme.colors.text }}>Sem avaliações ainda</Text>
        )}
        <Text style={{ color: theme.colors.textMuted }}>
          {data.veiculosAtivos} veículo(s) ativo(s)
        </Text>
        <Text style={{ color: theme.colors.textMuted }}>
          {data.tiposVeiculo.join(", ") || "Tipo de veículo não informado"}
        </Text>
        <Text style={{ color: theme.colors.textMuted }}>
          {data.alunosTransportados} aluno(s) transportado(s)
        </Text>
        <Text style={[styles.mensalidade, { color: theme.colors.primary }]}>
          {data.mensalidadeAPartirDeCentavos !== null
            ? `A partir de R$ ${(data.mensalidadeAPartirDeCentavos / 100).toFixed(2)}/mês`
            : "Consulte a mensalidade"}
        </Text>
      </VehicleCard>

      {(data.telefone ?? data.whatsapp) ? (
        <VehicleCard>
          <Text style={[styles.secao, { color: theme.colors.text }]}>Contato</Text>
          {data.telefone ? (
            <Text style={{ color: theme.colors.textMuted }}>Telefone: {data.telefone}</Text>
          ) : null}
          {data.whatsapp ? (
            <Text style={{ color: theme.colors.textMuted }}>WhatsApp: {data.whatsapp}</Text>
          ) : null}
        </VehicleCard>
      ) : null}

      <View style={styles.secaoAvaliacoes}>
        <Text style={[styles.secao, { color: theme.colors.text }]}>Avaliações recentes</Text>
        {data.avaliacoesRecentes.length === 0 ? (
          <Text style={{ color: theme.colors.textMuted }}>Nenhuma avaliação ainda.</Text>
        ) : (
          data.avaliacoesRecentes.map((avaliacao, index) => (
            <VehicleCard key={`${avaliacao.responsavelNome}-${index}`}>
              <View style={styles.avaliacao}>
                <Star size={14} color={theme.colors.text} fill={theme.colors.text} />
                <Text style={{ color: theme.colors.text }}>
                  {avaliacao.nota} — {avaliacao.responsavelNome}
                </Text>
              </View>
              {avaliacao.comentario ? (
                <Text style={{ color: theme.colors.textMuted }}>{avaliacao.comentario}</Text>
              ) : null}
            </VehicleCard>
          ))
        )}
      </View>

      <VehicleButton
        label="Solicitar Transporte"
        onPress={() => navigation.navigate("SolicitarTransporte", { transportadorId })}
      />
    </VehicleScreen>
  );
}

const styles = StyleSheet.create({
  avaliacao: { alignItems: "center", flexDirection: "row", gap: 4 },
  header: { alignItems: "center", flexDirection: "row", gap: 8, justifyContent: "space-between" },
  mensalidade: { fontWeight: "600" },
  nome: { fontSize: 18, fontWeight: "700" },
  secao: { fontSize: 16, fontWeight: "700" },
  secaoAvaliacoes: { gap: 8 },
});

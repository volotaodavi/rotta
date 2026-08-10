import { Star } from "@rotta/icons/native";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";


import { useTransporterDetail } from "../hooks/use-transporters";

import type { MarketplaceStackParamList } from "@/navigation/types";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { ReactNode } from "react";

import {
  StatusPill,
  VehicleButton,
  VehicleCard,
  VehicleScreen,
} from "@/features/vehicles/components";
import { useTheme } from "@/providers/theme-provider";

type Props = NativeStackScreenProps<MarketplaceStackParamList, "TransportadorDetalhes">;

/**
 * Perfil do transportador (Prompt "UX/UI Master do Marketplace" —
 * "a página deve lembrar um site institucional... tudo organizado em
 * blocos"). Reorganizado a partir da versão anterior (um único
 * `VehicleCard` de métricas) em blocos nomeados — "primeira dobra" com
 * o CTA "Solicitar transporte" logo no topo (nunca escondido no fim da
 * tela), depois "Quem somos"/"Frota"/"Área atendida"/"Contato"/
 * "Avaliações recentes", cada um só com dado que a API já expõe de
 * verdade (`TransporterDetail`, `GET /marketplace/transporters/:id`).
 *
 * Fora desta entrega, por exigirem endpoint novo (não construído aqui —
 * ver Dossiê 37 §4): lista de motoristas/monitores nomeados, lista de
 * escolas atendidas, galeria de fotos, documentação pública, FAQ.
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
      {data.avaliacaoMedia !== null ? (
        <View style={styles.avaliacao}>
          <Star size={14} color={theme.colors.text} fill={theme.colors.text} />
          <Text style={{ color: theme.colors.text }}>
            {data.avaliacaoMedia.toFixed(1)} ({data.totalAvaliacoes} avaliações)
          </Text>
        </View>
      ) : (
        <Text style={{ color: theme.colors.textMuted }}>Sem avaliações ainda</Text>
      )}

      <VehicleButton
        label="Solicitar transporte"
        onPress={() => navigation.navigate("SolicitarTransporte", { transportadorId })}
      />

      <Section title="Quem somos" theme={theme}>
        <Text style={{ color: theme.colors.textMuted }}>{data.razaoSocial}</Text>
        <Text style={{ color: theme.colors.textMuted }}>
          {data.tiposVeiculo.length > 0
            ? `Transportadora ${data.tipo === "MEI" ? "MEI" : data.tipo === "AUTONOMO" ? "autônoma" : "empresa"} atuando em ${data.cidade}/${data.estado}.`
            : `Atua em ${data.cidade}/${data.estado}.`}
        </Text>
      </Section>

      <Section title="Frota" theme={theme}>
        <Text style={{ color: theme.colors.text }}>{data.veiculosAtivos} veículo(s) ativo(s)</Text>
        <Text style={{ color: theme.colors.textMuted }}>
          {data.tiposVeiculo.join(", ") || "Tipo de veículo não informado"}
        </Text>
        <Text style={{ color: theme.colors.textMuted }}>
          {data.alunosTransportados} aluno(s) transportado(s) atualmente
        </Text>
        <Text style={[styles.mensalidade, { color: theme.colors.primary }]}>
          {data.mensalidadeAPartirDeCentavos !== null
            ? `A partir de R$ ${(data.mensalidadeAPartirDeCentavos / 100).toFixed(2)}/mês`
            : "Consulte a mensalidade"}
        </Text>
      </Section>

      <Section title="Área atendida" theme={theme}>
        <Text style={{ color: theme.colors.textMuted }}>
          {data.cidade}/{data.estado} — a {data.distanciaKm.toFixed(1)} km de você
        </Text>
      </Section>

      {(data.telefone ?? data.whatsapp) ? (
        <Section title="Contato" theme={theme}>
          {data.telefone ? (
            <Text style={{ color: theme.colors.textMuted }}>Telefone: {data.telefone}</Text>
          ) : null}
          {data.whatsapp ? (
            <Text style={{ color: theme.colors.textMuted }}>WhatsApp: {data.whatsapp}</Text>
          ) : null}
        </Section>
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
    </VehicleScreen>
  );
}

function Section({
  title,
  theme,
  children,
}: {
  title: string;
  theme: ReturnType<typeof useTheme>["theme"];
  children: ReactNode;
}): JSX.Element {
  return (
    <VehicleCard>
      <Text style={[styles.secao, { color: theme.colors.text }]}>{title}</Text>
      {children}
    </VehicleCard>
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

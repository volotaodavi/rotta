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
import { VEHICLE_CATEGORY_LABEL, VEHICLE_CATEGORY_TONE } from "@/features/vehicles/labels";
import { useTheme } from "@/providers/theme-provider";

type Props = NativeStackScreenProps<MarketplaceStackParamList, "TransportadorDetalhes">;

/**
 * Perfil do transportador (Prompt "UX/UI Master do Marketplace" —
 * "a página deve lembrar um site institucional... tudo organizado em
 * blocos"). Reorganizado a partir da versão anterior (um único
 * `VehicleCard` de métricas) em blocos nomeados — "primeira dobra" com
 * o CTA "Solicitar transporte" logo no topo (nunca escondido no fim da
 * tela), depois "Quem somos"/"Frota"/"Equipe"/"Escolas atendidas"/
 * "Área atendida"/"Contato"/"Avaliações recentes", cada um só com dado
 * que a API já expõe de verdade (`TransporterDetail`, `GET
 * /marketplace/transporters/:id`).
 *
 * "Equipe" e "Escolas atendidas" foram fechadas na Fase 2 (Dossiê 38) —
 * antes exigiam endpoint novo, registrado como gap no Dossiê 37 §4;
 * "equipe" só mostra nome/papel, nunca CPF/telefone/e-mail (mesmo
 * cuidado de nunca vazar dado pessoal além do que o perfil público
 * precisa).
 *
 * Ainda fora desta entrega, por não terem modelo de dado nenhum hoje:
 * galeria de fotos, documentação pública (documento de motorista é
 * dado sensível — nunca exposto publicamente, decisão de segurança,
 * não só de escopo), FAQ.
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
        <Text style={{ color: theme.colors.textMuted }}>
          {formatAtuandoDesde(data.atuandoDesde)}
        </Text>
        {data.tempoMedioRespostaHoras !== null ? (
          <Text style={{ color: theme.colors.textMuted }}>
            Responde solicitações em média em {formatTempoResposta(data.tempoMedioRespostaHoras)}
          </Text>
        ) : null}
      </Section>

      <Section title="Frota" theme={theme}>
        <Text style={{ color: theme.colors.text }}>{data.veiculosAtivos} veículo(s) ativo(s)</Text>
        <Text style={{ color: theme.colors.textMuted }}>
          {data.tiposVeiculo.join(", ") || "Tipo de veículo não informado"}
        </Text>
        {/* Modalidade real da frota (Dossiê 45 — CATEGORIA B ≠ TRANSPORTE
            ESCOLAR): nunca inferida da categoria da CNH de um motorista,
            sempre da frota declarada em `Vehicle.categoria`. O badge
            ESCOLAR distingue "declarado pela empresa" de "verificado"
            (achado C1 da auditoria Legal↔Produto). */}
        <View style={styles.modalidades}>
          {data.categoriasVeiculo.length > 0 ? (
            data.categoriasVeiculo.map((categoria) =>
              categoria === "ESCOLAR" ? (
                <StatusPill
                  key={categoria}
                  label={
                    data.escolarVerificado
                      ? "Transporte escolar (verificado)"
                      : "Transporte escolar (não verificado)"
                  }
                  tone={data.escolarVerificado ? "success" : "warning"}
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
            <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>
              Modalidade não informada
            </Text>
          )}
        </View>
        {data.categoriasVeiculo.includes("ESCOLAR") && !data.escolarVerificado ? (
          <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>
            A empresa declarou veículo(s) para transporte escolar, mas nenhum motorista vinculado
            teve CNH categoria D/E, EAR, curso e antecedentes totalmente verificados ainda.
          </Text>
        ) : null}
        <Text style={{ color: theme.colors.textMuted }}>
          {data.alunosTransportados} aluno(s) transportado(s) atualmente
        </Text>
        <Text style={[styles.mensalidade, { color: theme.colors.primary }]}>
          {data.mensalidadeAPartirDeCentavos !== null
            ? `A partir de R$ ${(data.mensalidadeAPartirDeCentavos / 100).toFixed(2)}/mês`
            : "Consulte a mensalidade"}
        </Text>
      </Section>

      {data.equipe.length > 0 ? (
        <Section title="Equipe" theme={theme}>
          {data.equipe.map((membro, index) => (
            <Text key={`${membro.nome}-${index}`} style={{ color: theme.colors.textMuted }}>
              {membro.nome} — {membro.papel === "motorista" ? "Motorista" : "Monitor(a)"}
            </Text>
          ))}
        </Section>
      ) : null}

      {data.escolasAtendidas.length > 0 ? (
        <Section title="Escolas atendidas" theme={theme}>
          {data.escolasAtendidas.map((escola) => (
            <Text key={escola.id} style={{ color: theme.colors.textMuted }}>
              {escola.nomeOficial}
            </Text>
          ))}
        </Section>
      ) : null}

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

/** "Atuando há X anos"/"há poucos meses" — sempre a partir de `Company.createdAt` real, nunca um número solto. */
function formatAtuandoDesde(atuandoDesde: string): string {
  const meses = Math.max(
    0,
    Math.floor((Date.now() - new Date(atuandoDesde).getTime()) / (1000 * 60 * 60 * 24 * 30)),
  );
  if (meses < 12) {
    return meses <= 1 ? "Na Rotta há poucas semanas" : `Na Rotta há ${meses} meses`;
  }
  const anos = Math.floor(meses / 12);
  return `Na Rotta há ${anos} ano${anos > 1 ? "s" : ""}`;
}

function formatTempoResposta(horas: number): string {
  if (horas < 1) return "menos de 1 hora";
  if (horas < 24) return `${Math.round(horas)} hora(s)`;
  return `${Math.round(horas / 24)} dia(s)`;
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
  modalidades: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  nome: { fontSize: 18, fontWeight: "700" },
  secao: { fontSize: 16, fontWeight: "700" },
  secaoAvaliacoes: { gap: 8 },
});

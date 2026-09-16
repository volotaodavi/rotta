import { useNavigation } from "@react-navigation/native";
import { useAuth } from "@rotta/auth/native";
import { Timeline } from "@rotta/ui/native";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { useStudent } from "../hooks/use-students";
import { useResponsavelTransportState } from "../hooks/use-transport-state";
import { buildContratoSteps, buildSolicitacaoSteps } from "../timeline-steps";

import { AcompanhamentoSection, TripTrackingOverlay } from "./transporte-inicio-screen";

import type { ParentTabParamList } from "@/navigation/types";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";

import { VehicleButton, VehicleCard, VehicleScreen } from "@/features/vehicles/components";
import { useTheme } from "@/providers/theme-provider";

/** Iniciais do nome pro avatar (sem foto de perfil no produto ainda — nunca uma imagem inventada). */
function iniciais(nome: string | undefined): string {
  if (!nome) return "?";
  const partes = nome.trim().split(/\s+/);
  const primeira = partes[0]?.[0] ?? "";
  const ultima = partes.length > 1 ? (partes[partes.length - 1]?.[0] ?? "") : "";
  return (primeira + ultima).toUpperCase();
}

/**
 * "Início" do Responsável — aba própria (15/09/2026, pedido do usuário
 * com a referência visual em mãos: "traga a experiência do design pro
 * app").
 *
 * Fecha uma pendência que o próprio código registrava: a referência tem
 * CINCO abas (Início · Viagens · Mapa · Notificações · Perfil), e o app
 * tinha quatro porque "Início" e "Mapa" eram a MESMA aba — a
 * `MapaScreen` trocava de conteúdo conforme o estado do transporte
 * (mapa de busca sem contrato, painel operacional com contrato). Essa
 * fusão estava anotada como lacuna deliberada em `mapa-screen.tsx`
 * ("mudança maior de navegação... deixada fora desta entrega").
 *
 * Agora cada aba tem um papel só, como no design: esta é a Home
 * (saudação + estado do transporte + atalho "Acompanhar no mapa"), e
 * "Mapa" é sempre o mapa. Nenhuma fonte de dados nova: reaproveita
 * `useResponsavelTransportState` e as mesmas
 * `AcompanhamentoSection`/`Timeline` que a aba "Viagens" usa — nunca
 * duas versões divergentes de "em que etapa o Responsável está".
 */
export function ParentInicioScreen(): JSX.Element {
  const { theme } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation<BottomTabNavigationProp<ParentTabParamList>>();
  const {
    state,
    isLoading,
    contratoAtivo,
    ultimoContrato,
    solicitacoesPendentes,
    solicitacaoAprovadaSemContrato,
  } = useResponsavelTransportState();
  const { data: aluno } = useStudent(contratoAtivo?.studentId ?? ultimoContrato?.studentId);
  const [trackingOpen, setTrackingOpen] = useState(false);

  const primeiroNome = user?.nome?.split(" ")[0];
  const semTransporte = state === "SEM_TRANSPORTE" || state === "CONTRATO_ENCERRADO";

  return (
    <>
      <VehicleScreen>
        {/* Cabeçalho da referência ("HOME - RESPONSÁVEL"): avatar +
            "Olá, <nome>!" em negrito + uma linha explicando o que a tela
            faz. O avatar é de iniciais — o produto não tem foto de
            perfil, e uma foto inventada seria pior que a inicial. */}
        <View style={styles.header}>
          <View style={[styles.avatar, { backgroundColor: theme.colors.primaryMuted }]}>
            <Text style={[styles.avatarLabel, { color: theme.colors.primary }]}>
              {iniciais(user?.nome)}
            </Text>
          </View>
          <View style={styles.headerTexto}>
            <Text style={[styles.saudacao, { color: theme.colors.text }]}>
              {primeiroNome ? `Olá, ${primeiroNome}!` : "Olá!"}
            </Text>
            <Text style={{ color: theme.colors.textMuted, fontSize: 14 }}>
              Acompanhe o transporte do seu filho.
            </Text>
          </View>
        </View>

        {isLoading ? null : semTransporte ? (
          <VehicleCard>
            <Text style={[styles.tituloEstado, { color: theme.colors.text }]}>
              Você ainda não tem transporte escolar
            </Text>
            <Text style={{ color: theme.colors.textMuted }}>
              Busque um transportador próximo de você para solicitar o transporte do seu filho.
            </Text>
            <VehicleButton
              label="Buscar transportadores"
              onPress={() => navigation.navigate("Mapa")}
            />
          </VehicleCard>
        ) : (
          <>
            <Text style={[styles.tituloEstado, { color: theme.colors.text }]}>
              {state === "TRANSPORTE_ATIVO"
                ? "Viagem em andamento"
                : aluno
                  ? `Transporte de ${aluno.nome.split(" ")[0]}`
                  : "Seu transporte"}
            </Text>

            {state === "SOLICITACAO_PENDENTE"
              ? solicitacoesPendentes.map((request) => (
                  <VehicleCard key={request.id}>
                    <Timeline steps={buildSolicitacaoSteps(request)} theme={theme} />
                  </VehicleCard>
                ))
              : null}

            {state === "AGUARDANDO_CONTRATO" ? (
              <VehicleCard>
                <Timeline steps={buildContratoSteps(ultimoContrato ?? null)} theme={theme} />
                {solicitacaoAprovadaSemContrato ? (
                  <Text style={{ color: theme.colors.textMuted, marginTop: theme.spacing[2] }}>
                    Sua solicitação foi aprovada. O transportador vai gerar o contrato em breve.
                  </Text>
                ) : null}
              </VehicleCard>
            ) : null}

            {state === "TRANSPORTE_ATIVO" && contratoAtivo ? (
              <>
                <AcompanhamentoSection contrato={contratoAtivo} />
                <VehicleButton label="Acompanhar no mapa" onPress={() => setTrackingOpen(true)} />
              </>
            ) : null}

            <VehicleButton
              label="Ver detalhes completos"
              variant="secondary"
              onPress={() => navigation.navigate("Transporte")}
            />
          </>
        )}
      </VehicleScreen>

      {trackingOpen && contratoAtivo ? (
        <TripTrackingOverlay contrato={contratoAtivo} onClose={() => setTrackingOpen(false)} />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: "center",
    borderRadius: 999,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  avatarLabel: { fontSize: 16, fontWeight: "700" },
  header: { alignItems: "center", flexDirection: "row", gap: 12 },
  headerTexto: { flex: 1, gap: 2 },
  saudacao: { fontSize: 20, fontWeight: "700" },
  tituloEstado: { fontSize: 16, fontWeight: "700" },
});

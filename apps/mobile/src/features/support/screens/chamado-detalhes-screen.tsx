import { Sparkles } from "@rotta/icons/native";
import { useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { StatusPill, VehicleButton, VehicleCard, VehicleScreen, VehicleTextField } from "@/features/vehicles/components";
import { useTheme } from "@/providers/theme-provider";

import { useAddSupportMessage, useCloseSupportTicket, useSupportTicketDetail } from "../hooks/use-support";
import { SUPPORT_TICKET_STATUS_LABEL, SUPPORT_TICKET_STATUS_TONE } from "../labels";

import type { SupportStackParamList } from "@/navigation/types";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";


type Props = NativeStackScreenProps<SupportStackParamList, "Detalhes">;

/**
 * Detalhe/chat de um chamado (Epic B) — espelha
 * `apps/web/.../chamados/[id]/page.tsx`: descrição original + histórico
 * de mensagens (IA/Admin Rotta/o próprio autor com estilos distintos) +
 * campo de resposta + encerrar chamado.
 */
export function ChamadoDetalhesScreen({ route }: Props): JSX.Element {
  const { ticketId } = route.params;
  const { theme } = useTheme();
  const [mensagem, setMensagem] = useState("");

  const { data: ticket, isLoading, isError } = useSupportTicketDetail(ticketId);
  const addMessage = useAddSupportMessage(ticketId);
  const closeTicket = useCloseSupportTicket(ticketId);

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  if (isError || !ticket) {
    return (
      <VehicleScreen>
        <Text style={{ color: theme.colors.danger }}>Chamado não encontrado.</Text>
      </VehicleScreen>
    );
  }

  return (
    <VehicleScreen>
      <View style={styles.cabecalho}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.titulo, { color: theme.colors.text }]}>{ticket.assunto}</Text>
          <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>
            Aberto em {new Date(ticket.createdAt).toLocaleDateString("pt-BR")}
          </Text>
        </View>
        <StatusPill
          label={SUPPORT_TICKET_STATUS_LABEL[ticket.status]}
          tone={SUPPORT_TICKET_STATUS_TONE[ticket.status]}
        />
      </View>

      <VehicleCard>
        <Text style={{ color: theme.colors.textMuted, fontSize: 12, fontWeight: "600" }}>
          Descrição original
        </Text>
        <Text style={{ color: theme.colors.text }}>{ticket.descricao}</Text>
      </VehicleCard>

      <View style={{ gap: 8 }}>
        <Text style={{ color: theme.colors.text, fontWeight: "700" }}>Conversa</Text>
        {ticket.mensagens.length === 0 ? (
          <Text style={{ color: theme.colors.textMuted }}>Nossa equipe responderá em breve.</Text>
        ) : (
          ticket.mensagens.map((message) => {
            const backgroundColor = message.autorIsIA
              ? `${theme.colors.primary}0D`
              : message.autorIsAdminRotta
                ? theme.colors.surfaceElevated
                : `${theme.colors.primary}1A`;
            return (
              <View
                key={message.id}
                style={[
                  styles.bolha,
                  {
                    backgroundColor,
                    borderRadius: theme.radius.md,
                    alignSelf: message.autorIsIA || message.autorIsAdminRotta ? "flex-start" : "flex-end",
                  },
                ]}
              >
                <View style={styles.autorLinha}>
                  {message.autorIsIA ? <Sparkles size={13} color={theme.colors.textMuted} /> : null}
                  <Text style={{ color: theme.colors.textMuted, fontSize: 11 }}>
                    {message.autorIsIA ? "Rotta AI" : message.autorIsAdminRotta ? "Suporte Rotta" : message.autorNome}
                    {" · "}
                    {new Date(message.createdAt).toLocaleString("pt-BR")}
                  </Text>
                </View>
                <Text style={{ color: theme.colors.text }}>{message.mensagem}</Text>
              </View>
            );
          })
        )}
      </View>

      <VehicleTextField
        label="Escreva uma mensagem..."
        value={mensagem}
        onChangeText={setMensagem}
        multiline
        numberOfLines={3}
        style={{ minHeight: 72, textAlignVertical: "top" }}
      />

      <VehicleButton
        label="Enviar"
        disabled={mensagem.trim().length === 0}
        isLoading={addMessage.isPending}
        onPress={() => {
          addMessage.mutate(mensagem, { onSuccess: () => setMensagem("") });
        }}
      />

      {ticket.status !== "ENCERRADO" ? (
        <VehicleButton
          label="Encerrar chamado"
          variant="secondary"
          isLoading={closeTicket.isPending}
          onPress={() => closeTicket.mutate()}
        />
      ) : null}
    </VehicleScreen>
  );
}

const styles = StyleSheet.create({
  autorLinha: { alignItems: "center", flexDirection: "row", gap: 4 },
  bolha: { gap: 4, maxWidth: "85%", padding: 12 },
  cabecalho: { alignItems: "flex-start", flexDirection: "row", gap: 12 },
  center: { alignItems: "center", flex: 1, justifyContent: "center" },
  titulo: { fontSize: 18, fontWeight: "700" },
});

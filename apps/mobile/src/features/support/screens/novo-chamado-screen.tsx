import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { VehicleButton, VehicleCard, VehicleScreen, VehicleTextField } from "@/features/vehicles/components";
import { useTheme } from "@/providers/theme-provider";

import { useCreateSupportTicket } from "../hooks/use-support";
import { SUPPORT_TICKET_CATEGORIA_LABEL } from "../labels";

import type { SupportStackParamList } from "@/navigation/types";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { SupportTicketCategoria } from "@rotta/api-client";


type Props = NativeStackScreenProps<SupportStackParamList, "Novo">;

const CATEGORIAS = Object.keys(SUPPORT_TICKET_CATEGORIA_LABEL) as SupportTicketCategoria[];

/**
 * Abertura de chamado (Epic B) — espelha `apps/web/.../chamados/novo/page.tsx`:
 * mesma validação (assunto/descrição mínimos), mesmas 4 categorias. Sem
 * `<select>` nativo equivalente — categoria vira uma linha de chips
 * selecionáveis (`VehicleButton` alternando `primary`/`secondary`, mesmo
 * truque já usado em filtros de outras telas nativas).
 */
export function NovoChamadoScreen({ navigation }: Props): JSX.Element {
  const { theme } = useTheme();
  const createTicket = useCreateSupportTicket();
  const [assunto, setAssunto] = useState("");
  const [descricao, setDescricao] = useState("");
  const [categoria, setCategoria] = useState<SupportTicketCategoria>("DUVIDA");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(): void {
    if (assunto.trim().length < 3 || descricao.trim().length < 10) {
      setError("Informe um assunto e uma descrição com mais detalhes.");
      return;
    }
    setError(null);
    createTicket.mutate(
      { assunto, descricao, categoria },
      {
        onSuccess: (ticket) => {
          navigation.replace("Detalhes", { ticketId: ticket.id });
        },
        onError: () => {
          setError("Não foi possível abrir o chamado. Tente novamente.");
        },
      },
    );
  }

  return (
    <VehicleScreen>
      <VehicleTextField
        label="Assunto"
        value={assunto}
        onChangeText={setAssunto}
        placeholder="Resuma o problema em poucas palavras"
      />

      <VehicleCard style={{ gap: 8 }}>
        <Text style={{ color: theme.colors.textMuted, fontWeight: "600", fontSize: 13 }}>
          Categoria
        </Text>
        <View style={styles.chips}>
          {CATEGORIAS.map((value) => (
            <VehicleButton
              key={value}
              label={SUPPORT_TICKET_CATEGORIA_LABEL[value]}
              variant={categoria === value ? "primary" : "secondary"}
              onPress={() => setCategoria(value)}
            />
          ))}
        </View>
      </VehicleCard>

      <VehicleTextField
        label="Descrição"
        value={descricao}
        onChangeText={setDescricao}
        placeholder="Descreva o problema ou dúvida com o máximo de detalhes possível"
        multiline
        numberOfLines={6}
        style={{ minHeight: 120, textAlignVertical: "top" }}
      />

      {error ? <Text style={{ color: theme.colors.danger }}>{error}</Text> : null}

      <VehicleButton
        label="Abrir chamado"
        onPress={handleSubmit}
        isLoading={createTicket.isPending}
      />
    </VehicleScreen>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
});

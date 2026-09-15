import { ArrowLeftRight, Home, School } from "@rotta/icons/native";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { TripSentido } from "@rotta/api-client";

import { useTheme } from "@/providers/theme-provider";

export const TRIP_SENTIDO_LABEL: Record<TripSentido, string> = {
  IDA: "Ida",
  VOLTA: "Volta",
};

/** Para onde o veículo está indo, em uma linha — o que a "placa" quer dizer na prática. */
export const TRIP_SENTIDO_DESCRICAO: Record<TripSentido, string> = {
  IDA: "Casa → escola",
  VOLTA: "Escola → casa",
};

/**
 * Alternador de sentido no formato pedido pelo usuário (15/09/2026):
 * "pode deixar na mesma rota um sentido, igual placa de ônibus mesmo:
 * (Sentido) Ida 🔄 Volta. Clicou na seta para ser a ida, ele vai
 * mostrar a rota da ida; clicou na seta para ser volta, ele vai
 * mostrar a rota de volta."
 *
 * É uma placa, não um formulário: os dois destinos ficam sempre
 * visíveis lado a lado, com o ativo destacado, e a seta no meio troca
 * — dá pra ler o sentido atual sem tocar em nada, que é o ponto de uma
 * placa de ônibus.
 *
 * O sentido pertence à VIAGEM, nunca à rota (ver `enum TripSentido` no
 * `schema.prisma`): a rota guarda as paradas uma vez só e roda nos dois
 * sentidos no mesmo dia. Por isso o mesmo componente serve pra duas
 * coisas diferentes — escolher o sentido da viagem que vai começar
 * (Motorista) e só VISUALIZAR a rota em cada sentido (Empresa/Gestor).
 */
export function SentidoSwitch({
  value,
  onChange,
  disabled,
}: {
  value: TripSentido;
  onChange: (sentido: TripSentido) => void;
  disabled?: boolean;
}): JSX.Element {
  const { theme } = useTheme();

  function renderLado(sentido: TripSentido, Icone: typeof Home): JSX.Element {
    const ativo = value === sentido;
    return (
      <Pressable
        accessibilityRole="radio"
        accessibilityState={{ selected: ativo, disabled: Boolean(disabled) }}
        accessibilityLabel={`${TRIP_SENTIDO_LABEL[sentido]} — ${TRIP_SENTIDO_DESCRICAO[sentido]}`}
        disabled={disabled}
        onPress={() => onChange(sentido)}
        style={[
          styles.lado,
          {
            backgroundColor: ativo ? theme.colors.primary : theme.colors.surface,
            borderColor: ativo ? theme.colors.primary : theme.colors.border,
            opacity: disabled ? 0.6 : 1,
          },
        ]}
      >
        <Icone size={16} color={ativo ? theme.colors.background : theme.colors.textMuted} />
        <Text
          style={[
            styles.ladoLabel,
            { color: ativo ? theme.colors.background : theme.colors.textMuted },
          ]}
        >
          {TRIP_SENTIDO_LABEL[sentido]}
        </Text>
      </Pressable>
    );
  }

  return (
    <View style={styles.bloco}>
      <Text style={[styles.rotulo, { color: theme.colors.textMuted }]}>Sentido</Text>
      <View style={styles.linha}>
        {renderLado("IDA", School)}
        {/* A seta também alterna: é o gesto mais natural depois de ler
            a placa, e evita ter que mirar no lado certo. */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Inverter o sentido"
          disabled={disabled}
          onPress={() => onChange(value === "IDA" ? "VOLTA" : "IDA")}
          style={styles.seta}
        >
          <ArrowLeftRight size={18} color={theme.colors.primary} />
        </Pressable>
        {renderLado("VOLTA", Home)}
      </View>
      <Text style={[styles.descricao, { color: theme.colors.textMuted }]}>
        {TRIP_SENTIDO_DESCRICAO[value]}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bloco: { gap: 6 },
  descricao: { fontSize: 12 },
  lado: {
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
    flex: 1,
    flexDirection: "row",
    gap: 6,
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  ladoLabel: { fontSize: 14, fontWeight: "700" },
  linha: { alignItems: "center", flexDirection: "row", gap: 8 },
  rotulo: { fontSize: 12, fontWeight: "600", textTransform: "uppercase" },
  seta: { padding: 4 },
});

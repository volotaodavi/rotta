import { Check, X } from "@rotta/icons/native";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { SeloVerificado } from "./selo-verificado";

import type { PerfilVerificacao } from "../hooks/use-perfil-verificacao";

import { VehicleCard } from "@/features/vehicles/components";
import { useTheme } from "@/providers/theme-provider";

/**
 * Cartão "Verificação do perfil" — a contraparte honesta do selo.
 *
 * Verificado: diz isso em uma linha, com o mesmo check azul do
 * cabeçalho. Não verificado: lista item a item o que já está OK e o
 * que falta, com a pendência escrita por extenso (pedido do usuário:
 * "poderá ver TUDO oq foi preenchido, inclusive se a documentação
 * enviada está em dia e validada").
 */
export function VerificacaoCard({ verificacao }: { verificacao: PerfilVerificacao }): JSX.Element {
  const { theme } = useTheme();

  if (verificacao.isLoading) {
    return (
      <VehicleCard>
        <ActivityIndicator color={theme.colors.primary} />
      </VehicleCard>
    );
  }

  return (
    <VehicleCard>
      <View style={styles.titulo}>
        <Text style={[styles.tituloTexto, { color: theme.colors.text }]}>
          Verificação do perfil
        </Text>
        {verificacao.verificado ? <SeloVerificado size={18} /> : null}
      </View>

      <Text
        style={{
          color: verificacao.verificado ? theme.colors.success : theme.colors.textMuted,
          fontSize: 14,
        }}
      >
        {verificacao.verificado
          ? "Perfil 100% verificado para todas as funcionalidades do app."
          : "Falta pouco para o seu perfil ficar 100% verificado."}
      </Text>

      <View style={styles.lista}>
        {verificacao.requisitos.map((requisito) => (
          <View key={requisito.id} style={styles.item}>
            <View
              style={[
                styles.marcador,
                {
                  backgroundColor: requisito.ok
                    ? `${theme.colors.success}26`
                    : `${theme.colors.warning}26`,
                },
              ]}
            >
              {requisito.ok ? (
                <Check size={12} color={theme.colors.success} strokeWidth={3} />
              ) : (
                <X size={12} color={theme.colors.warning} strokeWidth={3} />
              )}
            </View>
            <View style={styles.itemTexto}>
              <Text style={[styles.itemLabel, { color: theme.colors.text }]}>
                {requisito.label}
              </Text>
              {requisito.ok ? null : (
                <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>
                  {requisito.pendencia}
                </Text>
              )}
            </View>
          </View>
        ))}
      </View>
    </VehicleCard>
  );
}

/**
 * Linha "rótulo — valor" dos dados cadastrais. `valor` vazio/nulo vira
 * "Não informado" em cinza, nunca uma linha some: o pedido é ver TUDO
 * que foi preenchido, e saber o que NÃO foi faz parte disso.
 */
export function DadoLinha({
  rotulo,
  valor,
}: {
  rotulo: string;
  valor: string | null | undefined;
}): JSX.Element {
  const { theme } = useTheme();
  const preenchido = Boolean(valor && valor.trim().length > 0);

  return (
    <View style={styles.dado}>
      <Text style={[styles.dadoRotulo, { color: theme.colors.textMuted }]}>{rotulo}</Text>
      <Text
        style={[
          styles.dadoValor,
          { color: preenchido ? theme.colors.text : theme.colors.placeholder },
        ]}
      >
        {preenchido ? valor : "Não informado"}
      </Text>
    </View>
  );
}

/** Cartão "Meus dados" — cabeçalho com título e as linhas passadas como filhos. */
export function DadosCard({
  titulo,
  children,
}: {
  titulo: string;
  children: React.ReactNode;
}): JSX.Element {
  const { theme } = useTheme();

  return (
    <VehicleCard>
      <Text style={[styles.tituloTexto, { color: theme.colors.text }]}>{titulo}</Text>
      <View style={styles.dados}>{children}</View>
    </VehicleCard>
  );
}

const styles = StyleSheet.create({
  dado: { flexDirection: "row", gap: 12, justifyContent: "space-between" },
  dadoRotulo: { fontSize: 14 },
  dadoValor: { flexShrink: 1, fontSize: 14, fontWeight: "600", textAlign: "right" },
  dados: { gap: 8 },
  item: { alignItems: "flex-start", flexDirection: "row", gap: 10 },
  itemLabel: { fontSize: 14, fontWeight: "600" },
  itemTexto: { flex: 1, gap: 2 },
  lista: { gap: 12, marginTop: 4 },
  marcador: {
    alignItems: "center",
    borderRadius: 999,
    height: 20,
    justifyContent: "center",
    marginTop: 1,
    width: 20,
  },
  titulo: { alignItems: "center", flexDirection: "row", gap: 6 },
  tituloTexto: { fontSize: 16, fontWeight: "700" },
});

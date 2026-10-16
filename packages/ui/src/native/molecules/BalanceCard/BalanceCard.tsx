import { Pressable, StyleSheet, Text, View } from "react-native";

import type { Theme } from "@rotta/theme";

/**
 * BalanceCard — o cartão azul de saldo, no topo da área financeira.
 *
 * ## A que dado isto corresponde na Rotta
 *
 * Ao saldo da carteira que já existe no produto (`Wallet`,
 * `WalletTransaction`, `WithdrawalRequest`, tela
 * `features/wallet/carteira-screen`), e **não** ao conceito de conta
 * digital bancária do segundo conceito visual de 16/10/2026. Aquele
 * depende de instituição financeira parceira e não existe.
 *
 * ## O olho que esconde o valor não é enfeite
 *
 * O transportador abre o app dentro da van, com passageiro atrás e
 * gente ao lado na escola. Saldo visível por padrão numa tela que fica
 * aberta no suporte é exposição real. Quem chama decide o padrão e
 * guarda a preferência; este componente só desenha os dois estados.
 *
 * ## Valor já formatado
 *
 * `valorFormatado` chega pronto ("R$ 12.480,50"), porque formatação de
 * moeda depende de locale e de onde o número veio, em centavos inteiros
 * no banco. Componente que formata moeda sozinho é componente que
 * arredonda errado em algum lugar.
 */
export interface BalanceCardProps {
  label: string;
  /** Já formatado, por exemplo "R$ 12.480,50". */
  valorFormatado: string;
  /** Falso esconde o valor atrás de pontos. */
  visivel: boolean;
  onAlternarVisibilidade: () => void;
  /** Seta à direita, quando há tela de detalhe. */
  onPress?: () => void;
  /** Ícones já renderizados pela tela: este pacote não escolhe ícone. */
  iconeVisivel?: JSX.Element;
  iconeOculto?: JSX.Element;
  iconeDetalhe?: JSX.Element;
  theme: Theme;
}

export function BalanceCard({
  label,
  valorFormatado,
  visivel,
  onAlternarVisibilidade,
  onPress,
  iconeVisivel,
  iconeOculto,
  iconeDetalhe,
  theme,
}: BalanceCardProps): JSX.Element {
  return (
    <View
      style={[
        styles.cartao,
        {
          backgroundColor: theme.colors.primary,
          borderRadius: theme.radius.lg,
          padding: theme.spacing[4],
        },
      ]}
    >
      <View style={styles.topo}>
        <Text style={[styles.rotulo, { color: theme.colors.onPrimary }]}>{label}</Text>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={visivel ? "Esconder saldo" : "Mostrar saldo"}
          onPress={onAlternarVisibilidade}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          {visivel ? iconeVisivel : iconeOculto}
        </Pressable>
      </View>

      <View style={[styles.linhaValor, { marginTop: theme.spacing[2] }]}>
        <Text
          accessibilityLabel={visivel ? valorFormatado : "Saldo oculto"}
          numberOfLines={1}
          style={[styles.valor, { color: theme.colors.onPrimary }]}
        >
          {visivel ? valorFormatado : "••••••"}
        </Text>

        {onPress ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Abrir ${label}`}
            onPress={onPress}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            {iconeDetalhe}
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cartao: {
    width: "100%",
  },
  topo: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  rotulo: {
    fontSize: 13,
    fontWeight: "600",
    /* Levemente translúcido seria mais bonito e pior: contraste de
       rótulo sobre azul já fica no limite em tela ao sol. */
    opacity: 0.9,
  },
  linhaValor: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  valor: {
    flexShrink: 1,
    fontSize: 28,
    fontVariant: ["tabular-nums"],
    fontWeight: "700",
  },
});

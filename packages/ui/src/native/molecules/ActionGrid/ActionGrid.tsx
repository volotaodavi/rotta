import { Pressable, StyleSheet, Text, View } from "react-native";

import type { Theme } from "@rotta/theme";

/**
 * ActionGrid — a fileira de atalhos com ícone redondo e rótulo embaixo.
 *
 * "Receber, Pix, Transferir, Pagar" na área financeira do conceito de
 * 16/10/2026, e serve igual para qualquer tela que ofereça três ou
 * quatro ações de mesmo peso.
 *
 * ## Ação desabilitada aparece, e diz por quê
 *
 * Boa parte das ações do conceito financeiro **não existe no produto**:
 * transferência e pagamento de conta dependem de instituição
 * financeira. A saída honesta não é esconder o atalho, que faria a
 * pessoa procurar para sempre, nem desenhá-lo ativo e dar erro no
 * toque. É mostrar apagado, com `motivoIndisponivel` lido pelo leitor
 * de tela e disponível para a tela exibir num toque.
 *
 * ## Quatro por linha, no máximo
 *
 * Em 360 pontos de largura, cinco atalhos deixam cada rótulo com menos
 * de 60 pontos, e "Transferir" não cabe. Mais de quatro vira segunda
 * linha, que é melhor que texto cortado.
 */
export interface ActionGridItem {
  key: string;
  label: string;
  /** Ícone já renderizado pela tela. */
  icon: JSX.Element;
  onPress: () => void;
  /** Quando presente, o atalho fica apagado e não dispara. */
  motivoIndisponivel?: string;
}

export interface ActionGridProps {
  items: ActionGridItem[];
  theme: Theme;
}

export function ActionGrid({ items, theme }: ActionGridProps): JSX.Element {
  return (
    <View style={[styles.grade, { gap: theme.spacing[2] }]}>
      {items.map((item) => {
        const indisponivel = Boolean(item.motivoIndisponivel);

        return (
          <Pressable
            key={item.key}
            accessibilityRole="button"
            accessibilityState={{ disabled: indisponivel }}
            accessibilityLabel={
              indisponivel ? `${item.label}, ${item.motivoIndisponivel}` : item.label
            }
            disabled={indisponivel}
            onPress={item.onPress}
            style={[styles.celula, { opacity: indisponivel ? 0.45 : 1 }]}
          >
            <View
              style={[
                styles.bolha,
                {
                  backgroundColor: theme.colors.primaryMuted,
                  borderRadius: theme.radius.md,
                },
              ]}
            >
              {item.icon}
            </View>
            <Text
              numberOfLines={1}
              style={[styles.rotulo, { color: theme.colors.text, marginTop: theme.spacing[2] }]}
            >
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grade: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  celula: {
    alignItems: "center",
    flexBasis: "22%",
    flexGrow: 1,
    minWidth: 68,
  },
  bolha: {
    alignItems: "center",
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  rotulo: {
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
});

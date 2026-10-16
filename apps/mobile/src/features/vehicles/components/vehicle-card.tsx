import { StyleSheet, View, type ViewProps } from "react-native";

import { useTheme } from "@/providers/theme-provider";

/**
 * Cartão base — usado em todas as telas "Vehicle*" (nome histórico;
 * hoje é o kit visual compartilhado por Responsável, Motorista e
 * Empresa/Gestor fora do fluxo de Auth, ver `vehicle-screen.tsx`).
 *
 * ## O que mudou em 16/10/2026
 *
 * O fundador olhou o app depois do redesenho e disse que estava "com
 * cara de IA". Ele estava certo, e este arquivo é metade da causa:
 * todo cartão do app era um retângulo branco com uma borda cinza de um
 * ponto, e um app inteiro feito de retângulos cinzas idênticos é
 * exatamente o que um template produz.
 *
 * No conceito que ele aprovou, o cartão branco se separa do fundo
 * branco por uma sombra larga, quase invisível, azulada — não por
 * borda. A borda continua existindo, mas quase apagada, só para
 * segurar o contorno em tela com brilho alto, onde a sombra some.
 *
 * `overflow: "hidden"` ficou de fora de propósito: ele corta a sombra
 * no Android.
 */
export function VehicleCard({ style, children, ...rest }: ViewProps): JSX.Element {
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.card,
        theme.elevation.soft.native,
        {
          backgroundColor: theme.colors.card,
          borderColor: theme.colors.hairline,
          borderRadius: theme.radius.lg,
          padding: theme.spacing[4],
          gap: theme.spacing[2],
        },
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1 },
});

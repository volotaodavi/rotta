import { ArrowLeft } from "@rotta/icons/native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "@/providers/theme-provider";

interface AuthHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
}

/**
 * Painel curvo no topo das telas "porta de entrada" do fluxo de
 * autenticação (Entrar, Criar Conta, Esqueci Senha) — pedido do usuário
 * 15/09/2026: "faça o UX/UI design do app da Rotta... pegue de exemplo
 * [print de um app kit de transporte] e faça conforme a necessidade da
 * Rotta". O print de referência usa um painel escuro com borda inferior
 * curva por trás de um cartão flutuante; aqui o painel usa
 * `theme.colors.primary` (azul da marca — nunca um hex novo, Dossiê 24
 * §4.1: "a marca se restringe a azul, preto, branco e cinza") em vez do
 * navy genérico do exemplo.
 *
 * `#FFFFFF` abaixo é o mesmo padrão já usado em `auth-button.tsx` pro
 * texto do botão `primary` — texto branco fixo sobre um fundo que já É
 * a cor de marca, não uma cor de tema alternativa.
 *
 * Usado só por `AuthHeaderScreen` (nunca solta numa tela) — ver ali a
 * nota de quais telas recebem esse tratamento e quais continuam com
 * `AuthScreen` simples.
 */
// Texto/ícone branco fixo sobre o painel `primary` (não uma cor de tema
// alternativa) — const isolada, mesmo padrão de `textColor` em
// `auth-button.tsx`.
const ON_PRIMARY = "#FFFFFF";

export function AuthHeader({ title, subtitle, onBack }: AuthHeaderProps): JSX.Element {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.header,
        {
          backgroundColor: theme.colors.primary,
          paddingTop: insets.top + theme.spacing[4],
          paddingHorizontal: theme.spacing[6],
          paddingBottom: theme.spacing[12],
          borderBottomLeftRadius: theme.radius.xl * 2,
          borderBottomRightRadius: theme.radius.xl * 2,
          gap: theme.spacing[1],
        },
      ]}
    >
      {onBack ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Voltar"
          onPress={onBack}
          hitSlop={12}
          style={[styles.back, { marginBottom: theme.spacing[3] }]}
        >
          <ArrowLeft size={22} color={ON_PRIMARY} />
        </Pressable>
      ) : null}

      <Text
        style={[
          styles.title,
          { color: ON_PRIMARY, fontSize: theme.typography.headlineMobile.fontSize },
        ]}
      >
        {title}
      </Text>

      {subtitle ? (
        <Text
          style={[
            styles.subtitle,
            {
              color: ON_PRIMARY,
              opacity: theme.opacity.strong,
              fontSize: theme.typography.body.fontSize,
            },
          ]}
        >
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  back: { alignSelf: "flex-start" },
  header: {},
  subtitle: { lineHeight: 22 },
  title: { fontWeight: "700" },
});

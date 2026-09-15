import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";


import { AuthHeader } from "./auth-header";

import type { ReactNode } from "react";

import { useTheme } from "@/providers/theme-provider";

interface AuthHeaderScreenProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  children: ReactNode;
}

/**
 * Variante de `AuthScreen` com o cabeçalho curvo de `AuthHeader` —
 * pedido do usuário 15/09/2026 (redesign do fluxo de autenticação, ver
 * `auth-header.tsx`). O conteúdo (`children`) fica num cartão que sobe
 * por baixo da curva do cabeçalho (`marginTop` negativo), mesmo efeito
 * visual do print de referência.
 *
 * Reservada só às telas "porta de entrada" de cada subfluxo — Entrar,
 * Criar Conta (escolha de papel + formulário da Área Pessoal), Esqueci
 * Senha. Os formulários multi-etapa mais longos e mais densos (Criar
 * Conta Autônomo, Convite Transportadora, Área Profissional etc.)
 * continuam em `AuthScreen` simples — um cabeçalho grande compete por
 * espaço/atenção com telas que já têm muitos campos, e são o tipo de
 * tela que o próprio print de referência também não estiliza assim
 * (só a "porta de entrada" de cada fluxo leva o cabeçalho curvo lá).
 */
export function AuthHeaderScreen({
  title,
  subtitle,
  onBack,
  children,
}: AuthHeaderScreenProps): JSX.Element {
  const { theme } = useTheme();

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.background }]}>
      <AuthHeader title={title} subtitle={subtitle} onBack={onBack} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            styles.card,
            {
              backgroundColor: theme.colors.background,
              borderTopLeftRadius: theme.radius.xl,
              borderTopRightRadius: theme.radius.xl,
              padding: theme.spacing[6],
              gap: theme.spacing[4],
              marginTop: -theme.spacing[6],
            },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flexGrow: 1 },
  flex: { flex: 1 },
});

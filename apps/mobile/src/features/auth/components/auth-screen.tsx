import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from "react-native";

import type { ReactNode } from "react";

import { useTheme } from "@/providers/theme-provider";

/**
 * Container comum das telas do fluxo de entrada/autenticação (Dossiê 15) —
 * fundo do tema + scroll + deslocamento de teclado, para não repetir este
 * boilerplate em cada tela.
 */
export function AuthScreen({ children }: { children: ReactNode }): JSX.Element {
  const { theme } = useTheme();

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={[styles.content, { padding: theme.spacing[6] }]}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, gap: 16, justifyContent: "center" },
  flex: { flex: 1 },
});

import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from "react-native";

import type { ReactNode } from "react";

import { useTheme } from "@/providers/theme-provider";


/**
 * Container comum das telas de "Meu Veículo" (briefing "APP MOBILE") —
 * mesmo papel de `AuthScreen` (Dossiê 15), porém local a esta feature:
 * ainda não existe Design System nativo (`@rotta/ui/native`) para
 * componentes de tela cheia, mesma decisão de escopo já registrada em
 * `features/auth/components/auth-screen.tsx`.
 */
export function VehicleScreen({ children }: { children: ReactNode }): JSX.Element {
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
  content: { flexGrow: 1, gap: 16 },
  flex: { flex: 1 },
});

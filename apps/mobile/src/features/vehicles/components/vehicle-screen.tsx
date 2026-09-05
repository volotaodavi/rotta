import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from "react-native";

import type { ReactNode } from "react";

import { useTheme } from "@/providers/theme-provider";

/**
 * Container comum das telas de "Meu Veículo" (briefing "APP MOBILE") —
 * mesmo papel de `AuthScreen` (Dossiê 15), porém local a esta feature:
 * ainda não existe Design System nativo (`@rotta/ui/native`) para
 * componentes de tela cheia, mesma decisão de escopo já registrada em
 * `features/auth/components/auth-screen.tsx`.
 *
 * `backgroundColor` opcional (spec de identidade do Motorista/Monitor,
 * 31/08/2026) — telas exclusivas desses dois papéis passam
 * `theme.colors.driverBackground`; todo outro consumidor continua com
 * o `theme.colors.background` padrão, sem precisar saber que a prop existe.
 */
export function VehicleScreen({
  children,
  backgroundColor,
}: {
  children: ReactNode;
  backgroundColor?: string;
}): JSX.Element {
  const { theme } = useTheme();

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: backgroundColor ?? theme.colors.background }]}
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

import { StyleSheet, Text, View } from "react-native";

import type { Theme } from "@rotta/theme";

/**
 * Timeline — primeiro componente real de `@rotta/ui/native` (Dossiê 22
 * Seção 5.1 documentava `export {}`: nenhuma tela tinha precisado ainda
 * de um componente cross-feature; Prompt "UX/UI Master do Marketplace"
 * pede uma Timeline real para a seção STATUS do Responsável — momento
 * concreto de sair do local-a-feature, mesmo princípio do `Modal` em
 * `@rotta/ui/web`, Dossiê 36).
 *
 * Cada etapa tem um estado real (`done`/`current`/`pending`/`error`) —
 * nunca uma barra de progresso fake: quem chama passa o índice/estado
 * derivado do enum de status real do backend (`TransportRequestStatus`/
 * `ContractStatus`), nunca um número solto.
 */
export type TimelineStepState = "done" | "current" | "pending" | "error";

export interface TimelineStep {
  key: string;
  label: string;
  description?: string;
  state: TimelineStepState;
}

export interface TimelineProps {
  steps: TimelineStep[];
  theme: Theme;
}

export function Timeline({ steps, theme }: TimelineProps): JSX.Element {
  return (
    <View>
      {steps.map((step, index) => {
        const isLast = index === steps.length - 1;
        const dotColor =
          step.state === "done"
            ? theme.colors.success
            : step.state === "current"
              ? theme.colors.primary
              : step.state === "error"
                ? theme.colors.danger
                : theme.colors.border;
        const lineColor = step.state === "done" ? theme.colors.success : theme.colors.border;
        const labelColor = step.state === "pending" ? theme.colors.textMuted : theme.colors.text;

        return (
          <View key={step.key} style={styles.row}>
            <View style={styles.rail}>
              <View
                style={[
                  styles.dot,
                  {
                    backgroundColor: step.state === "pending" ? "transparent" : dotColor,
                    borderColor: dotColor,
                    borderWidth: step.state === "current" ? 3 : 2,
                  },
                ]}
              />
              {!isLast ? <View style={[styles.line, { backgroundColor: lineColor }]} /> : null}
            </View>
            <View style={[styles.content, { paddingBottom: isLast ? 0 : theme.spacing[4] }]}>
              <Text
                style={[
                  styles.label,
                  {
                    color: labelColor,
                    fontWeight: step.state === "current" ? "700" : "600",
                  },
                ]}
              >
                {step.label}
              </Text>
              {step.description ? (
                <Text style={[styles.description, { color: theme.colors.textMuted }]}>
                  {step.description}
                </Text>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, gap: 2, paddingLeft: 12 },
  description: { fontSize: 13 },
  dot: { borderRadius: 7, height: 14, width: 14 },
  label: { fontSize: 14 },
  line: { flex: 1, marginTop: 4, width: 2 },
  rail: { alignItems: "center", width: 14 },
  row: { flexDirection: "row" },
});

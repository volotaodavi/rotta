import { ApiError } from "@rotta/api-client";
import { useState } from "react";
import { StyleSheet, Text } from "react-native";

import {
  useMarkStudentAbsentToday,
  useRemoveStudentAbsentToday,
  useStudentDailyAbsence,
} from "../hooks/use-students";

import { VehicleButton, VehicleCard } from "@/features/vehicles/components";
import { useTheme } from "@/providers/theme-provider";

/**
 * "Meu filho não vai hoje" (Frente 10, auditoria 31/08/2026, pedido do
 * usuário: "informando que o aluno não irá") — paridade mobile de
 * `apps/web/src/app/(dashboard)/alunos/[id]/page.tsx` (Epic C); backend
 * já existia (`POST/GET/DELETE /students/:id/ausencia-hoje`), só
 * faltava aqui. Marcado ANTES da viagem do dia começar (o backend
 * rejeita depois, com mensagem clara — mesmo guard de
 * address-overrides); nunca bloqueia o uso do app.
 *
 * Componente INLINE (cartão), não tela navegável — `AcompanhamentoSection`
 * (onde isso é exibido) é renderizado em duas navegadores diferentes
 * (`MarketplaceNavigator` via `mapa-screen.tsx` E direto como aba de
 * `ParentNavigator` via `transporte-inicio-screen.tsx`), então um
 * `Stack.Screen` novo só seria alcançável a partir de um dos dois —
 * um cartão com `useState` local funciona nos dois sem precisar de
 * `useNavigation()`.
 */
export function AusenciaHojeCard({
  studentId,
  nomeAluno,
}: {
  studentId: string;
  nomeAluno: string;
}): JSX.Element | null {
  const { theme } = useTheme();
  const { data: ausenciaHoje, isLoading } = useStudentDailyAbsence(studentId);
  const markAbsentToday = useMarkStudentAbsentToday(studentId);
  const removeAbsentToday = useRemoveStudentAbsentToday(studentId);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleMarcar(): Promise<void> {
    setErrorMessage(null);
    try {
      await markAbsentToday.mutateAsync(undefined);
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError ? error.message : "Erro inesperado ao marcar a ausência.",
      );
    }
  }

  async function handleDesmarcar(): Promise<void> {
    setErrorMessage(null);
    try {
      await removeAbsentToday.mutateAsync();
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError ? error.message : "Erro inesperado ao desmarcar a ausência.",
      );
    }
  }

  if (isLoading) return null;

  return (
    <VehicleCard>
      <Text style={[styles.titulo, { color: theme.colors.text }]}>Ausência de hoje</Text>

      {ausenciaHoje ? (
        <>
          <Text style={{ color: theme.colors.textMuted }}>
            {nomeAluno} está marcado como ausente hoje — o motorista vai pular a parada dele.
          </Text>
          <VehicleButton
            label="Desmarcar ausência"
            variant="secondary"
            isLoading={removeAbsentToday.isPending}
            onPress={() => void handleDesmarcar()}
          />
        </>
      ) : (
        <>
          <Text style={{ color: theme.colors.textMuted }}>
            Se {nomeAluno} não vai ter transporte hoje, avise antes da viagem começar.
          </Text>
          <VehicleButton
            label={`${nomeAluno.split(" ")[0]} não vai hoje`}
            variant="danger"
            isLoading={markAbsentToday.isPending}
            onPress={() => void handleMarcar()}
          />
        </>
      )}

      {errorMessage ? (
        <Text style={{ color: theme.colors.danger, fontSize: 12 }}>{errorMessage}</Text>
      ) : null}
    </VehicleCard>
  );
}

const styles = StyleSheet.create({
  titulo: { fontSize: 15, fontWeight: "700" },
});

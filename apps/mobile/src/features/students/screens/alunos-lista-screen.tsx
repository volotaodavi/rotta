import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { useStudentsList } from "../hooks/use-students";

import type { ParentPerfilStackParamList } from "@/navigation/types";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { SCHOOL_SHIFT_LABEL } from "@/features/schools/labels";
import { VehicleButton, VehicleCard, VehicleScreen } from "@/features/vehicles/components";
import { useTheme } from "@/providers/theme-provider";

type Props = NativeStackScreenProps<ParentPerfilStackParamList, "Alunos">;

/**
 * "Meus Alunos" (Frente 2 — pedido do usuário 11/09/2026: "Responsável:
 * alunos + escolas + perfil") — espelha `apps/web/.../alunos/page.tsx`
 * em escopo completo (não reduzido — este é o próprio Responsável).
 * Antes só existia um card read-only dentro do Perfil; agora navega
 * pra detalhe/edição, e tem um cadastro isolado próprio (não mais só
 * acoplado à solicitação de transporte).
 */
export function AlunosListaScreen({ navigation }: Props): JSX.Element {
  const { theme } = useTheme();
  const { data, isLoading, isError, refetch } = useStudentsList({ pageSize: 100 });

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  if (isError) {
    return (
      <VehicleScreen>
        <Text style={{ color: theme.colors.danger }}>Não foi possível carregar seus alunos.</Text>
        <VehicleButton label="Tentar novamente" onPress={() => void refetch()} />
      </VehicleScreen>
    );
  }

  return (
    <VehicleScreen>
      <VehicleButton label="+ Adicionar aluno" onPress={() => navigation.navigate("AlunoNovo")} />

      {!data || data.items.length === 0 ? (
        <Text style={{ color: theme.colors.textMuted }}>Nenhum aluno cadastrado ainda.</Text>
      ) : (
        data.items.map((aluno) => (
          <Pressable
            key={aluno.id}
            onPress={() => navigation.navigate("AlunoDetalhe", { studentId: aluno.id })}
          >
            <VehicleCard>
              <Text style={[styles.nome, { color: theme.colors.text }]}>{aluno.nome}</Text>
              <Text style={{ color: theme.colors.textMuted, fontSize: 14 }}>
                {SCHOOL_SHIFT_LABEL[aluno.turno]}
              </Text>
            </VehicleCard>
          </Pressable>
        ))
      )}
    </VehicleScreen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center", flex: 1, justifyContent: "center" },
  nome: { fontSize: 16, fontWeight: "600" },
});

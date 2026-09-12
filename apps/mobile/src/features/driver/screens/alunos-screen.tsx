import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { useAlunosDasMinhasRotas } from "../hooks/use-driver-routes";

import { VehicleCard, VehicleScreen } from "@/features/vehicles/components";
import { useTheme } from "@/providers/theme-provider";

/**
 * "Meus Alunos" do Motorista/Monitor (Frente 4 — pedido do usuário
 * 11/09/2026: "Monitor: alunos + perfil + escolas") — lista, só
 * leitura, de todos os alunos de todas as rotas atribuídas à pessoa
 * (`useAlunosDasMinhasRotas`), não só os da viagem ativa. Cadastro/
 * edição de aluno não é papel do Motorista/Monitor — quem faz isso é o
 * Responsável (`features/students`) ou a Empresa/Gestor
 * (`features/empresa`, pré-cadastro).
 *
 * Mesma stack de Perfil pra Motorista e Monitor
 * (`DriverPerfilStackParamList`) — os dois ganham acesso, sem problema
 * já que é leitura pura.
 */
export function DriverAlunosScreen(): JSX.Element {
  const { theme } = useTheme();
  const { data: alunos, isLoading } = useAlunosDasMinhasRotas();

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <VehicleScreen>
      {alunos.length === 0 ? (
        <Text style={{ color: theme.colors.textMuted }}>
          Nenhum aluno nas suas rotas no momento.
        </Text>
      ) : (
        alunos.map((aluno) => (
          <VehicleCard key={aluno.id} style={styles.card}>
            <Text style={[styles.nome, { color: theme.colors.text }]}>
              {aluno.studentNome ?? "Aluno"}
            </Text>
            {aluno.schoolNome ? (
              <Text style={{ color: theme.colors.textMuted, fontSize: 13 }}>
                {aluno.schoolNome}
              </Text>
            ) : null}
            <Text style={{ color: theme.colors.textMuted, fontSize: 13 }}>
              Rota: {aluno.routeNome}
              {aluno.horarioPrevisto ? ` · ${aluno.horarioPrevisto}` : ""}
            </Text>
            {aluno.bairro ? (
              <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>{aluno.bairro}</Text>
            ) : null}
            {aluno.responsavelNome ? (
              <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>
                Responsável: {aluno.responsavelNome}
              </Text>
            ) : null}
          </VehicleCard>
        ))
      )}
    </VehicleScreen>
  );
}

const styles = StyleSheet.create({
  card: { gap: 4 },
  center: { alignItems: "center", flex: 1, justifyContent: "center" },
  nome: { fontSize: 15, fontWeight: "600" },
});

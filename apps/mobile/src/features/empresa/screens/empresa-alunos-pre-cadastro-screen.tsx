import { useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import {
  useCancelStudentPreRegistration,
  useCreateStudentPreRegistration,
  useStudentPreRegistrations,
} from "../hooks/use-student-pre-registrations";
import {
  STUDENT_PRE_REGISTRATION_STATUS_LABEL,
  STUDENT_PRE_REGISTRATION_STATUS_TONE,
} from "../labels";

import {
  StatusPill,
  VehicleButton,
  VehicleCard,
  VehicleScreen,
  VehicleTextField,
} from "@/features/vehicles/components";
import { useTheme } from "@/providers/theme-provider";

/**
 * Alunos — pré-cadastro (Frente 2, Empresa/Gestor reduzida) — espelha
 * `apps/web/.../alunos-pre-cadastro/page.tsx`: mesmo formulário (nome
 * do aluno + nome/celular do responsável), mesma listagem com status.
 * Cancelar só aparece quando `status === "PENDENTE"` (mesma regra da
 * Web — depois disso o responsável já iniciou/concluiu o próprio
 * cadastro, ou já foi cancelado).
 */
export function EmpresaAlunosPreCadastroScreen(): JSX.Element {
  const { theme } = useTheme();
  const { data, isLoading, isError, refetch } = useStudentPreRegistrations();
  const createPreRegistration = useCreateStudentPreRegistration();
  const cancelPreRegistration = useCancelStudentPreRegistration();

  const [nomeAluno, setNomeAluno] = useState("");
  const [nomeResponsavel, setNomeResponsavel] = useState("");
  const [celularResponsavel, setCelularResponsavel] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(): void {
    if (
      nomeAluno.trim().length < 2 ||
      nomeResponsavel.trim().length < 2 ||
      celularResponsavel.trim().length < 10
    ) {
      setError("Preencha o nome do aluno, o nome e o celular do responsável.");
      return;
    }
    setError(null);
    createPreRegistration.mutate(
      { nomeAluno: nomeAluno.trim(), nomeResponsavel: nomeResponsavel.trim(), celularResponsavel },
      {
        onSuccess: () => {
          setNomeAluno("");
          setNomeResponsavel("");
          setCelularResponsavel("");
        },
        onError: () => {
          setError("Não foi possível pré-cadastrar o aluno. Tente novamente.");
        },
      },
    );
  }

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
        <Text style={{ color: theme.colors.danger }}>
          Não foi possível carregar os pré-cadastros.
        </Text>
        <VehicleButton label="Tentar novamente" onPress={() => void refetch()} />
      </VehicleScreen>
    );
  }

  return (
    <VehicleScreen>
      <VehicleCard style={styles.form}>
        <Text style={{ color: theme.colors.textMuted, fontWeight: "600", fontSize: 13 }}>
          Novo pré-cadastro
        </Text>
        <VehicleTextField label="Nome do aluno" value={nomeAluno} onChangeText={setNomeAluno} />
        <VehicleTextField
          label="Nome do responsável"
          value={nomeResponsavel}
          onChangeText={setNomeResponsavel}
        />
        <VehicleTextField
          label="Celular do responsável"
          value={celularResponsavel}
          onChangeText={setCelularResponsavel}
          keyboardType="phone-pad"
        />
        {error ? <Text style={{ color: theme.colors.danger }}>{error}</Text> : null}
        <VehicleButton
          label="Pré-cadastrar"
          onPress={handleSubmit}
          isLoading={createPreRegistration.isPending}
        />
      </VehicleCard>

      {!data || data.length === 0 ? (
        <Text style={{ color: theme.colors.textMuted }}>Nenhum pré-cadastro ainda.</Text>
      ) : (
        data.map((item) => (
          <VehicleCard key={item.id}>
            <View style={styles.linha}>
              <Text style={[styles.nome, { color: theme.colors.text }]} numberOfLines={1}>
                {item.nomeAluno}
              </Text>
              <StatusPill
                label={STUDENT_PRE_REGISTRATION_STATUS_LABEL[item.status]}
                tone={STUDENT_PRE_REGISTRATION_STATUS_TONE[item.status]}
              />
            </View>
            <Text style={{ color: theme.colors.textMuted, fontSize: 13 }}>
              {item.nomeResponsavel} · {item.celularResponsavel}
            </Text>
            {item.status === "PENDENTE" ? (
              <VehicleButton
                label="Cancelar"
                variant="danger"
                isLoading={
                  cancelPreRegistration.isPending && cancelPreRegistration.variables === item.id
                }
                onPress={() => cancelPreRegistration.mutate(item.id)}
              />
            ) : null}
          </VehicleCard>
        ))
      )}
    </VehicleScreen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center", flex: 1, justifyContent: "center" },
  form: { gap: 10 },
  linha: { alignItems: "center", flexDirection: "row", gap: 8, justifyContent: "space-between" },
  nome: { flex: 1, fontSize: 15, fontWeight: "600" },
});

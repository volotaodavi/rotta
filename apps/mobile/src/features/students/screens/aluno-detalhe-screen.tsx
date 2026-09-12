import { ApiError, type SchoolShift, type StudentSex } from "@rotta/api-client";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import {
  useDeleteStudent,
  useMarkStudentAbsentToday,
  useRemoveStudentAbsentToday,
  useStudent,
  useStudentDailyAbsence,
  useUpdateStudent,
} from "../hooks/use-students";

import type { ParentPerfilStackParamList } from "@/navigation/types";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { SCHOOL_SHIFT_LABEL } from "@/features/schools/labels";
import { STUDENT_SEX_LABEL } from "@/features/students/labels";
import {
  VehicleButton,
  VehicleCard,
  VehicleScreen,
  VehicleTextField,
} from "@/features/vehicles/components";
import { useTheme } from "@/providers/theme-provider";

type Props = NativeStackScreenProps<ParentPerfilStackParamList, "AlunoDetalhe">;

/**
 * Detalhe/edição de um aluno (Frente 2) — mirror de
 * `apps/web/.../alunos/[id]/page.tsx`: campos que mudam com frequência
 * (nome/nascimento/sexo/turno/observações de saúde) são editáveis
 * direto; endereços de embarque/desembarque aparecem só como
 * referência (mesma decisão da Web — "mudam raramente e reaproveitar o
 * form completo de /alunos/novo aqui dobraria o tamanho desta tela sem
 * um pedido real por isso"; pra mudar, é pelo Chamados). Sem "ver
 * localização ao vivo" aqui — já existe na aba Viagens quando há
 * transporte ativo, não duplicado nesta tela.
 *
 * "Ver escola" (Frente 3, 11/09/2026) leva pro mesmo módulo Escolas já
 * usado por Motorista/Monitor, aberto direto na escola deste aluno.
 */
export function AlunoDetalheScreen({ route, navigation }: Props): JSX.Element {
  const { theme } = useTheme();
  const { studentId } = route.params;
  const { data: student, isLoading, isError, refetch } = useStudent(studentId);
  const updateStudent = useUpdateStudent(studentId);
  const deleteStudent = useDeleteStudent();
  const { data: ausenciaHoje } = useStudentDailyAbsence(studentId);
  const markAbsentToday = useMarkStudentAbsentToday(studentId);
  const removeAbsentToday = useRemoveStudentAbsentToday(studentId);

  const [nome, setNome] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");
  const [sexo, setSexo] = useState<StudentSex>("MASCULINO");
  const [turno, setTurno] = useState<SchoolShift>("MANHA");
  const [necessidadesEspeciais, setNecessidadesEspeciais] = useState("");
  const [medicamentos, setMedicamentos] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [absenceError, setAbsenceError] = useState<string | null>(null);
  const [confirmarRemocao, setConfirmarRemocao] = useState(false);

  useEffect(() => {
    if (!student) return;
    setNome(student.nome);
    setDataNascimento(student.dataNascimento.slice(0, 10));
    setSexo(student.sexo);
    setTurno(student.turno);
    setNecessidadesEspeciais(student.necessidadesEspeciais ?? "");
    setMedicamentos(student.medicamentos ?? "");
    setObservacoes(student.observacoes ?? "");
  }, [student]);

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  if (isError || !student) {
    return (
      <VehicleScreen>
        <Text style={{ color: theme.colors.danger }}>Não foi possível carregar este aluno.</Text>
        <VehicleButton label="Tentar novamente" onPress={() => void refetch()} />
      </VehicleScreen>
    );
  }

  async function handleSalvar(): Promise<void> {
    setErrorMessage(null);
    try {
      await updateStudent.mutateAsync({
        nome,
        dataNascimento,
        sexo,
        turno,
        necessidadesEspeciais: necessidadesEspeciais || undefined,
        medicamentos: medicamentos || undefined,
        observacoes: observacoes || undefined,
      });
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError ? error.message : "Erro inesperado ao salvar as alterações.",
      );
    }
  }

  async function handleRemover(): Promise<void> {
    try {
      await deleteStudent.mutateAsync(studentId);
      navigation.goBack();
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError ? error.message : "Erro inesperado ao remover o aluno.",
      );
    }
  }

  async function handleMarcarAusente(): Promise<void> {
    setAbsenceError(null);
    try {
      await markAbsentToday.mutateAsync(undefined);
    } catch (error) {
      setAbsenceError(
        error instanceof ApiError ? error.message : "Erro inesperado ao marcar a ausência.",
      );
    }
  }

  async function handleDesmarcarAusente(): Promise<void> {
    setAbsenceError(null);
    try {
      await removeAbsentToday.mutateAsync();
    } catch (error) {
      setAbsenceError(
        error instanceof ApiError ? error.message : "Erro inesperado ao desmarcar a ausência.",
      );
    }
  }

  return (
    <VehicleScreen>
      <VehicleCard style={styles.card}>
        <Text style={{ color: theme.colors.textMuted, fontWeight: "600", fontSize: 13 }}>
          Dados do aluno
        </Text>
        <VehicleTextField label="Nome completo" value={nome} onChangeText={setNome} />
        <VehicleTextField
          label="Data de nascimento (AAAA-MM-DD)"
          value={dataNascimento}
          onChangeText={setDataNascimento}
        />
        <View style={styles.chips}>
          {(Object.keys(STUDENT_SEX_LABEL) as StudentSex[]).map((value) => (
            <VehicleButton
              key={value}
              label={STUDENT_SEX_LABEL[value]}
              variant={sexo === value ? "primary" : "secondary"}
              onPress={() => setSexo(value)}
            />
          ))}
        </View>
        <View style={styles.chips}>
          {(Object.keys(SCHOOL_SHIFT_LABEL) as SchoolShift[]).map((value) => (
            <VehicleButton
              key={value}
              label={SCHOOL_SHIFT_LABEL[value]}
              variant={turno === value ? "primary" : "secondary"}
              onPress={() => setTurno(value)}
            />
          ))}
        </View>
      </VehicleCard>

      <VehicleCard style={styles.card}>
        <Text style={{ color: theme.colors.textMuted, fontWeight: "600", fontSize: 13 }}>
          Endereços
        </Text>
        <Text style={{ color: theme.colors.textMuted, fontSize: 13 }}>
          Embarque: {student.embarqueLogradouro}, {student.embarqueNumero}, {student.embarqueBairro}
          , {student.embarqueCidade}/{student.embarqueEstado}
        </Text>
        <Text style={{ color: theme.colors.textMuted, fontSize: 13 }}>
          Desembarque: {student.desembarqueLogradouro}, {student.desembarqueNumero},{" "}
          {student.desembarqueBairro}, {student.desembarqueCidade}/{student.desembarqueEstado}
        </Text>
        <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>
          Para alterar um endereço, fale com o suporte pelos Chamados.
        </Text>
        <VehicleButton
          label="Vai levar/buscar num endereço diferente algum dia?"
          variant="ghost"
          onPress={() => navigation.navigate("AlunoEnderecoDoDia", { studentId })}
        />
      </VehicleCard>

      <VehicleCard style={styles.card}>
        <Text style={{ color: theme.colors.textMuted, fontWeight: "600", fontSize: 13 }}>
          Escola
        </Text>
        <VehicleButton
          label="Ver escola"
          variant="secondary"
          onPress={() => navigation.navigate("EscolaDetalhes", { schoolId: student.schoolId })}
        />
      </VehicleCard>

      <VehicleCard style={styles.card}>
        <Text style={{ color: theme.colors.textMuted, fontWeight: "600", fontSize: 13 }}>
          Ausência de hoje
        </Text>
        {ausenciaHoje ? (
          <>
            <Text style={{ color: theme.colors.textMuted, fontSize: 13 }}>
              {student.nome} está marcado como ausente hoje — o motorista vai pular a parada dele.
            </Text>
            <VehicleButton
              label="Desmarcar ausência"
              variant="secondary"
              isLoading={removeAbsentToday.isPending}
              onPress={() => void handleDesmarcarAusente()}
            />
          </>
        ) : (
          <>
            <Text style={{ color: theme.colors.textMuted, fontSize: 13 }}>
              Se {student.nome} não vai ter transporte hoje, avise antes da viagem começar.
            </Text>
            <VehicleButton
              label="Meu filho não vai hoje"
              variant="danger"
              isLoading={markAbsentToday.isPending}
              onPress={() => void handleMarcarAusente()}
            />
          </>
        )}
        {absenceError ? <Text style={{ color: theme.colors.danger }}>{absenceError}</Text> : null}
      </VehicleCard>

      <VehicleCard style={styles.card}>
        <Text style={{ color: theme.colors.textMuted, fontWeight: "600", fontSize: 13 }}>
          Informações adicionais
        </Text>
        <VehicleTextField
          label="Necessidades especiais"
          value={necessidadesEspeciais}
          onChangeText={setNecessidadesEspeciais}
          multiline
        />
        <VehicleTextField
          label="Medicamentos"
          value={medicamentos}
          onChangeText={setMedicamentos}
          multiline
        />
        <VehicleTextField
          label="Observações"
          value={observacoes}
          onChangeText={setObservacoes}
          multiline
        />
      </VehicleCard>

      {errorMessage ? <Text style={{ color: theme.colors.danger }}>{errorMessage}</Text> : null}

      <VehicleButton
        label="Salvar alterações"
        onPress={() => void handleSalvar()}
        isLoading={updateStudent.isPending}
      />

      <VehicleCard style={styles.card}>
        <Text style={{ color: theme.colors.danger, fontWeight: "700", fontSize: 13 }}>
          Remover aluno
        </Text>
        <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>
          Essa ação não pode ser desfeita.
        </Text>
        {confirmarRemocao ? (
          <View style={styles.chips}>
            <VehicleButton
              label="Cancelar"
              variant="ghost"
              onPress={() => setConfirmarRemocao(false)}
            />
            <VehicleButton
              label="Confirmar remoção"
              variant="danger"
              isLoading={deleteStudent.isPending}
              onPress={() => void handleRemover()}
            />
          </View>
        ) : (
          <VehicleButton
            label="Remover"
            variant="danger"
            onPress={() => setConfirmarRemocao(true)}
          />
        )}
      </VehicleCard>
    </VehicleScreen>
  );
}

const styles = StyleSheet.create({
  card: { gap: 8 },
  center: { alignItems: "center", flex: 1, justifyContent: "center" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
});

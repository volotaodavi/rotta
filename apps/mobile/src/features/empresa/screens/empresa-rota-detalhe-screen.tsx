import { useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import {
  useAddRouteStop,
  useAddRouteStudent,
  useRemoveRouteStudent,
  useRoute,
  useRouteStops,
  useRouteStudentCandidates,
  useRouteStudentsDetalhado,
  useUpdateRoute,
} from "../hooks/use-empresa-routes";

import type { EmpresaRotasStackParamList } from "@/navigation/types";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import {
  formatRouteWeekdaysAbbrev,
  ROUTE_STATUS_LABEL,
  ROUTE_STATUS_TONE,
} from "@/features/routes/labels";
import { useSchoolsList } from "@/features/schools/hooks/use-schools";
import { SCHOOL_SHIFT_LABEL } from "@/features/schools/labels";
import {
  StatusPill,
  VehicleButton,
  VehicleCard,
  VehicleScreen,
  VehicleTextField,
} from "@/features/vehicles/components";
import { useTheme } from "@/providers/theme-provider";

type Props = NativeStackScreenProps<EmpresaRotasStackParamList, "Detalhe">;

/**
 * Rotas — detalhe — dados da rota + pausar/ativar + paradas e alunos
 * vinculados. Frente 4b acrescentou "Adicionar parada" (só por escola
 * do catálogo, sem endereço livre na v1) e "Adicionar aluno" (contratos
 * `ATIVO` ainda não vinculados, escolhendo embarque/desembarque entre
 * as paradas já cadastradas).
 */
export function EmpresaRotaDetalheScreen({ route }: Props): JSX.Element {
  const { theme } = useTheme();
  const { routeId } = route.params;
  const { data: rota, isLoading, isError, refetch } = useRoute(routeId);
  const { data: paradas } = useRouteStops(routeId);
  const { data: alunos } = useRouteStudentsDetalhado(routeId);
  const { data: escolas } = useSchoolsList();
  const { data: candidatos } = useRouteStudentCandidates();
  const updateRoute = useUpdateRoute(routeId);
  const addStop = useAddRouteStop(routeId);
  const addStudent = useAddRouteStudent(routeId);
  const removeStudent = useRemoveRouteStudent(routeId);

  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [horarioPrevisto, setHorarioPrevisto] = useState("");
  const [erroParada, setErroParada] = useState<string | null>(null);

  const [alunoSelecionado, setAlunoSelecionado] = useState<{
    contractId: string;
    studentNome: string;
  } | null>(null);
  const [paradaEmbarqueId, setParadaEmbarqueId] = useState<string | null>(null);
  const [paradaDesembarqueId, setParadaDesembarqueId] = useState<string | null>(null);
  const [erroAluno, setErroAluno] = useState<string | null>(null);

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  if (isError || !rota) {
    return (
      <VehicleScreen>
        <Text style={{ color: theme.colors.danger }}>Não foi possível carregar esta rota.</Text>
        <VehicleButton label="Tentar novamente" onPress={() => void refetch()} />
      </VehicleScreen>
    );
  }

  const proximoStatus = rota.status === "ATIVA" ? "PAUSADA" : "ATIVA";
  const paradasOrdenadas = paradas ? [...paradas].sort((a, b) => a.ordem - b.ordem) : [];
  const idsAlunosJaVinculados = new Set((alunos ?? []).map((aluno) => aluno.studentId));
  const candidatosDisponiveis = (candidatos ?? []).filter(
    (candidato) => !idsAlunosJaVinculados.has(candidato.studentId),
  );

  function handleAdicionarParada(): void {
    if (!schoolId || horarioPrevisto.trim().length < 4) {
      setErroParada("Escolha uma escola e informe o horário previsto (ex.: 07:30).");
      return;
    }
    setErroParada(null);
    addStop.mutate(
      { ordem: paradasOrdenadas.length, schoolId, horarioPrevisto: horarioPrevisto.trim() },
      {
        onSuccess: () => {
          setSchoolId(null);
          setHorarioPrevisto("");
        },
        onError: () => setErroParada("Não foi possível adicionar a parada. Tente novamente."),
      },
    );
  }

  function handleVincularAluno(): void {
    if (!alunoSelecionado || !paradaEmbarqueId || !paradaDesembarqueId) {
      setErroAluno("Escolha o aluno e as paradas de embarque e desembarque.");
      return;
    }
    setErroAluno(null);
    addStudent.mutate(
      {
        contractId: alunoSelecionado.contractId,
        paradaEmbarqueId,
        paradaDesembarqueId,
      },
      {
        onSuccess: () => {
          setAlunoSelecionado(null);
          setParadaEmbarqueId(null);
          setParadaDesembarqueId(null);
        },
        onError: () => setErroAluno("Não foi possível vincular o aluno. Tente novamente."),
      },
    );
  }

  return (
    <VehicleScreen>
      <VehicleCard style={styles.card}>
        <View style={styles.linha}>
          <Text style={[styles.nome, { color: theme.colors.text }]}>{rota.nome}</Text>
          <StatusPill
            label={ROUTE_STATUS_LABEL[rota.status]}
            tone={ROUTE_STATUS_TONE[rota.status]}
          />
        </View>
        <Text style={{ color: theme.colors.textMuted }}>
          {SCHOOL_SHIFT_LABEL[rota.turno]} · {formatRouteWeekdaysAbbrev(rota.diasSemana)}
        </Text>
        <VehicleButton
          label={rota.status === "ATIVA" ? "Pausar rota" : "Ativar rota"}
          variant="secondary"
          isLoading={updateRoute.isPending}
          onPress={() => updateRoute.mutate({ status: proximoStatus })}
        />
      </VehicleCard>

      <VehicleCard style={styles.card}>
        <Text style={{ color: theme.colors.textMuted, fontWeight: "600", fontSize: 13 }}>
          Paradas
        </Text>
        {paradasOrdenadas.length === 0 ? (
          <Text style={{ color: theme.colors.textMuted }}>Nenhuma parada cadastrada ainda.</Text>
        ) : (
          paradasOrdenadas.map((parada) => (
            <Text key={parada.id} style={{ color: theme.colors.text }}>
              {parada.ordem + 1}. {parada.endereco} · {parada.horarioPrevisto}
            </Text>
          ))
        )}

        <Text style={{ color: theme.colors.textMuted, fontWeight: "600", fontSize: 13 }}>
          Adicionar parada
        </Text>
        <View style={styles.chips}>
          {(escolas?.items ?? []).map((escola) => (
            <VehicleButton
              key={escola.id}
              label={escola.nomeFantasia ?? escola.nomeOficial}
              variant={schoolId === escola.id ? "primary" : "secondary"}
              onPress={() => setSchoolId(escola.id)}
            />
          ))}
        </View>
        <VehicleTextField
          label="Horário previsto"
          value={horarioPrevisto}
          onChangeText={setHorarioPrevisto}
          placeholder="07:30"
        />
        {erroParada ? <Text style={{ color: theme.colors.danger }}>{erroParada}</Text> : null}
        <VehicleButton
          label="Adicionar parada"
          variant="secondary"
          isLoading={addStop.isPending}
          onPress={handleAdicionarParada}
        />
      </VehicleCard>

      <VehicleCard style={styles.card}>
        <Text style={{ color: theme.colors.textMuted, fontWeight: "600", fontSize: 13 }}>
          Alunos vinculados
        </Text>
        {!alunos || alunos.length === 0 ? (
          <Text style={{ color: theme.colors.textMuted }}>Nenhum aluno vinculado ainda.</Text>
        ) : (
          alunos.map((aluno) => (
            <View key={aluno.id} style={styles.linha}>
              <Text style={{ color: theme.colors.text }}>
                {aluno.studentNome ?? "Aluno"}
                {aluno.schoolNome ? ` · ${aluno.schoolNome}` : ""}
              </Text>
              <VehicleButton
                label="Remover"
                variant="danger"
                isLoading={removeStudent.isPending && removeStudent.variables === aluno.id}
                onPress={() => removeStudent.mutate(aluno.id)}
              />
            </View>
          ))
        )}

        <Text style={{ color: theme.colors.textMuted, fontWeight: "600", fontSize: 13 }}>
          Adicionar aluno
        </Text>
        {candidatosDisponiveis.length === 0 ? (
          <Text style={{ color: theme.colors.textMuted }}>
            Nenhum aluno com contrato ativo disponível pra vincular.
          </Text>
        ) : (
          <View style={styles.chips}>
            {candidatosDisponiveis.map((candidato) => (
              <VehicleButton
                key={candidato.contractId}
                label={candidato.studentNome}
                variant={
                  alunoSelecionado?.contractId === candidato.contractId ? "primary" : "secondary"
                }
                onPress={() => setAlunoSelecionado(candidato)}
              />
            ))}
          </View>
        )}

        {alunoSelecionado ? (
          <>
            <Text style={{ color: theme.colors.textMuted, fontSize: 13 }}>Parada de embarque</Text>
            <View style={styles.chips}>
              {paradasOrdenadas.map((parada) => (
                <VehicleButton
                  key={parada.id}
                  label={parada.endereco}
                  variant={paradaEmbarqueId === parada.id ? "primary" : "secondary"}
                  onPress={() => setParadaEmbarqueId(parada.id)}
                />
              ))}
            </View>
            <Text style={{ color: theme.colors.textMuted, fontSize: 13 }}>
              Parada de desembarque
            </Text>
            <View style={styles.chips}>
              {paradasOrdenadas.map((parada) => (
                <VehicleButton
                  key={parada.id}
                  label={parada.endereco}
                  variant={paradaDesembarqueId === parada.id ? "primary" : "secondary"}
                  onPress={() => setParadaDesembarqueId(parada.id)}
                />
              ))}
            </View>
            {erroAluno ? <Text style={{ color: theme.colors.danger }}>{erroAluno}</Text> : null}
            <VehicleButton
              label="Vincular aluno"
              isLoading={addStudent.isPending}
              onPress={handleVincularAluno}
            />
          </>
        ) : null}
      </VehicleCard>
    </VehicleScreen>
  );
}

const styles = StyleSheet.create({
  card: { gap: 6 },
  center: { alignItems: "center", flex: 1, justifyContent: "center" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  linha: { alignItems: "center", flexDirection: "row", gap: 8, justifyContent: "space-between" },
  nome: { flex: 1, fontSize: 17, fontWeight: "700" },
});

import { GraduationCap, MapPin } from "@rotta/icons/native";
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

import { useGeocodeAddress } from "@/features/marketplace/hooks/use-geocode-address";
import {
  formatRouteWeekdaysAbbrev,
  ROUTE_STATUS_LABEL,
  ROUTE_STATUS_TONE,
} from "@/features/routes/labels";
import {
  getStopDirection,
  STOP_DIRECTION_LABEL,
  STOP_DIRECTION_TONE,
} from "@/features/routes/stop-direction";
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
 * vinculados. Frente 4b acrescentou "Adicionar parada" e "Adicionar
 * aluno" (contratos `ATIVO` ainda não vinculados, escolhendo
 * embarque/desembarque entre as paradas já cadastradas).
 *
 * Ida e volta (pergunta do usuário 15/09/2026: "qual a intenção da
 * rota? Ter a rota de ida (escola) e rota de volta (casa/apartamento/
 * local de trabalho do responsável). Como que isso não está
 * funcionando no app?").
 *
 * O modelo sempre suportou: cada aluno tem endereço de EMBARQUE e de
 * DESEMBARQUE separados (`Student.embarque*`/`desembarque*`, cada um
 * com CEP e coordenada própria — por isso a volta pode ser outro lugar
 * que não a casa), e o vínculo aluno↔rota aponta as duas paradas
 * (`paradaEmbarqueId`/`paradaDesembarqueId`). O que faltava era do lado
 * do APP: esta tela só deixava criar parada NA ESCOLA (`schoolId`),
 * então a parada do outro lado do trajeto — a casa, o apartamento, o
 * trabalho do responsável — não tinha como ser criada pelo celular,
 * embora o backend (`CreateRouteStopDto`) e o Painel Web já aceitassem
 * endereço livre com coordenada. Agora tem, com a mesma
 * geocodificação do cadastro de aluno, e cada parada mostra o selo
 * Ida/Volta derivado dos vínculos.
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

  const [modoParada, setModoParada] = useState<"escola" | "endereco">("escola");
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [enderecoParada, setEnderecoParada] = useState("");
  const [horarioPrevisto, setHorarioPrevisto] = useState("");
  const [erroParada, setErroParada] = useState<string | null>(null);

  // Mesmo `POST /geo/geocode` (Rotta Geo Engine/Nominatim no servidor)
  // que o cadastro de aluno usa — a coordenada nunca é digitada.
  const enderecoGeocodificado = useGeocodeAddress(
    modoParada === "endereco" && enderecoParada.trim().length >= 8 ? enderecoParada.trim() : null,
  );

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
    if (horarioPrevisto.trim().length < 4) {
      setErroParada("Informe o horário previsto (ex.: 07:30).");
      return;
    }

    if (modoParada === "escola") {
      if (!schoolId) {
        setErroParada("Escolha a escola da parada.");
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
      return;
    }

    // Parada fora da escola (casa, apartamento, trabalho do
    // responsável): sem coordenada a parada existiria só como texto e o
    // motorista nunca a veria no mapa — por isso é bloqueada até a
    // geocodificação responder, em vez de salvar pela metade.
    if (!enderecoGeocodificado.coordenada) {
      setErroParada(
        enderecoGeocodificado.isGeocoding
          ? "Localizando o endereço no mapa…"
          : "Não localizamos esse endereço. Inclua rua, número, bairro e cidade.",
      );
      return;
    }
    setErroParada(null);
    addStop.mutate(
      {
        ordem: paradasOrdenadas.length,
        endereco: enderecoParada.trim(),
        latitude: enderecoGeocodificado.coordenada.latitude,
        longitude: enderecoGeocodificado.coordenada.longitude,
        horarioPrevisto: horarioPrevisto.trim(),
      },
      {
        onSuccess: () => {
          setEnderecoParada("");
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
          paradasOrdenadas.map((parada) => {
            const direcao = getStopDirection(parada, alunos);
            return (
              <View key={parada.id} style={styles.paradaLinha}>
                {parada.schoolId ? (
                  <GraduationCap size={16} color={theme.colors.primary} />
                ) : (
                  <MapPin size={16} color={theme.colors.primary} />
                )}
                <View style={styles.paradaTexto}>
                  <Text style={{ color: theme.colors.text }}>
                    {parada.ordem + 1}. {parada.endereco}
                  </Text>
                  <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>
                    {parada.horarioPrevisto}
                  </Text>
                </View>
                {/* Selo Ida/Volta derivado do vínculo aluno↔parada —
                    sem aluno vinculado ainda, nenhum selo. */}
                {direcao ? (
                  <StatusPill
                    label={STOP_DIRECTION_LABEL[direcao]}
                    tone={STOP_DIRECTION_TONE[direcao]}
                  />
                ) : null}
              </View>
            );
          })
        )}

        <Text style={{ color: theme.colors.textMuted, fontWeight: "600", fontSize: 13 }}>
          Adicionar parada
        </Text>

        {/* Dois modos, como no Painel Web: "Escola" pro destino da ida
            (catálogo já importado e geocodificado, nunca digitado) e
            "Outro endereço" pro destino da volta — casa, apartamento ou
            o trabalho do responsável. O app só tinha o modo Escola, e
            sem parada fora da escola não havia como montar a rota de
            volta pelo celular. */}
        <View style={styles.chips}>
          <VehicleButton
            label="Escola"
            variant={modoParada === "escola" ? "primary" : "secondary"}
            onPress={() => setModoParada("escola")}
          />
          <VehicleButton
            label="Outro endereço"
            variant={modoParada === "endereco" ? "primary" : "secondary"}
            onPress={() => setModoParada("endereco")}
          />
        </View>

        {modoParada === "escola" ? (
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
        ) : (
          <>
            <VehicleTextField
              label="Endereço da parada"
              value={enderecoParada}
              onChangeText={setEnderecoParada}
              placeholder="Rua das Flores, 123 — Centro, Campinas/SP"
            />
            <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>
              {enderecoGeocodificado.isGeocoding
                ? "Localizando no mapa…"
                : enderecoGeocodificado.coordenada
                  ? "Endereço localizado no mapa."
                  : "A Rotta Geo AI localiza a coordenada sozinha — nunca digitada."}
            </Text>
          </>
        )}

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
  paradaLinha: { alignItems: "center", flexDirection: "row", gap: 8, paddingVertical: 2 },
  paradaTexto: { flex: 1 },
});

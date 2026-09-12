import {
  ApiError,
  type CreateStudentInput,
  type SchoolShift,
  type StudentSex,
} from "@rotta/api-client";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useCreateStudent } from "../hooks/use-students";

import type { ParentPerfilStackParamList } from "@/navigation/types";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { useGeocodeAddress } from "@/features/marketplace/hooks/use-geocode-address";
import { useLocation } from "@/features/marketplace/hooks/use-location";
import { useSchoolsSearch } from "@/features/marketplace/hooks/use-school-picker";
import { SCHOOL_SHIFT_LABEL } from "@/features/schools/labels";
import {
  ENDERECO_VAZIO,
  EnderecoFields,
  enderecoCompleto,
  enderecoParaGeocodificar,
  type EnderecoForm,
} from "@/features/students/components/endereco-fields";
import { STUDENT_SEX_LABEL } from "@/features/students/labels";
import {
  VehicleButton,
  VehicleCard,
  VehicleScreen,
  VehicleTextField,
} from "@/features/vehicles/components";
import { useTheme } from "@/providers/theme-provider";

type Props = NativeStackScreenProps<ParentPerfilStackParamList, "AlunoNovo">;

const TURNOS = Object.keys(SCHOOL_SHIFT_LABEL) as SchoolShift[];

/**
 * Cadastro de aluno isolado (Frente 2) — mesmo formulário que já
 * existia embutido em `solicitar-transporte-screen.tsx` (agora
 * reaproveitando `EnderecoFields`), mas chamando `studentsApi.create`
 * direto (`useCreateStudent`) em vez de ficar acoplado a uma
 * solicitação de transporte. Sem CEP automático (a Web tem, o mobile
 * ainda não — preenchimento manual, mesma barra de qualidade que o
 * fluxo de Solicitar Transporte já tinha em produção).
 */
export function AlunoNovoScreen({ navigation }: Props): JSX.Element {
  const { theme } = useTheme();
  const createStudent = useCreateStudent();
  const { status: locationStatus, coords, requestLocation } = useLocation();

  useEffect(() => {
    if (locationStatus === "idle") {
      void requestLocation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só a 1ª vez ao entrar na tela.
  }, []);

  const [nome, setNome] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");
  const [sexo, setSexo] = useState<StudentSex>("MASCULINO");
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [schoolNome, setSchoolNome] = useState("");
  const [schoolSearch, setSchoolSearch] = useState("");
  const [turno, setTurno] = useState<SchoolShift>("MANHA");
  const [embarque, setEmbarque] = useState<EnderecoForm>(ENDERECO_VAZIO);
  const [desembarque, setDesembarque] = useState<EnderecoForm>(ENDERECO_VAZIO);
  const [necessidadesEspeciais, setNecessidadesEspeciais] = useState("");
  const [medicamentos, setMedicamentos] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data: schoolResults } = useSchoolsSearch(schoolSearch, coords);

  const embarqueGeocoded = useGeocodeAddress(enderecoParaGeocodificar(embarque));
  const desembarqueGeocoded = useGeocodeAddress(enderecoParaGeocodificar(desembarque));

  const podeEnviar =
    nome.trim().length > 0 &&
    dataNascimento.trim().length > 0 &&
    schoolId !== null &&
    enderecoCompleto(embarque) &&
    enderecoCompleto(desembarque);

  async function handleSalvar(): Promise<void> {
    if (!schoolId) return;
    setErrorMessage(null);
    const input: CreateStudentInput = {
      nome,
      dataNascimento,
      sexo,
      schoolId,
      turno,
      embarqueCep: embarque.cep,
      embarqueLogradouro: embarque.logradouro,
      embarqueNumero: embarque.numero,
      embarqueComplemento: embarque.complemento || undefined,
      embarqueBairro: embarque.bairro,
      embarqueCidade: embarque.cidade,
      embarqueEstado: embarque.estado,
      desembarqueCep: desembarque.cep,
      desembarqueLogradouro: desembarque.logradouro,
      desembarqueNumero: desembarque.numero,
      desembarqueComplemento: desembarque.complemento || undefined,
      desembarqueBairro: desembarque.bairro,
      desembarqueCidade: desembarque.cidade,
      desembarqueEstado: desembarque.estado,
      ...(embarqueGeocoded.coordenada
        ? {
            embarqueLatitude: embarqueGeocoded.coordenada.latitude,
            embarqueLongitude: embarqueGeocoded.coordenada.longitude,
          }
        : {}),
      ...(desembarqueGeocoded.coordenada
        ? {
            desembarqueLatitude: desembarqueGeocoded.coordenada.latitude,
            desembarqueLongitude: desembarqueGeocoded.coordenada.longitude,
          }
        : {}),
      necessidadesEspeciais: necessidadesEspeciais || undefined,
      medicamentos: medicamentos || undefined,
      observacoes: observacoes || undefined,
    };
    try {
      const aluno = await createStudent.mutateAsync(input);
      navigation.replace("AlunoDetalhe", { studentId: aluno.id });
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError ? error.message : "Erro inesperado ao cadastrar o aluno.",
      );
    }
  }

  return (
    <VehicleScreen>
      <Text style={[styles.secao, { color: theme.colors.text }]}>Dados do aluno</Text>
      <VehicleTextField label="Nome completo" value={nome} onChangeText={setNome} />
      <VehicleTextField
        label="Data de nascimento (AAAA-MM-DD)"
        value={dataNascimento}
        onChangeText={setDataNascimento}
        placeholder="ex: 2015-03-20"
      />
      <View style={styles.chipsRow}>
        {(Object.keys(STUDENT_SEX_LABEL) as StudentSex[]).map((value) => (
          <VehicleButton
            key={value}
            label={STUDENT_SEX_LABEL[value]}
            variant={sexo === value ? "primary" : "secondary"}
            onPress={() => setSexo(value)}
          />
        ))}
      </View>

      <Text style={[styles.secao, { color: theme.colors.text }]}>Escola</Text>
      {schoolId ? (
        <VehicleCard>
          <Text style={{ color: theme.colors.text }}>{schoolNome}</Text>
          <VehicleButton
            label="Trocar escola"
            variant="ghost"
            onPress={() => {
              setSchoolId(null);
              setSchoolNome("");
            }}
          />
        </VehicleCard>
      ) : (
        <>
          <VehicleTextField
            label="Buscar escola pelo nome"
            value={schoolSearch}
            onChangeText={setSchoolSearch}
          />
          <View style={styles.lista}>
            {(schoolResults?.items ?? []).map((school) => (
              <Pressable
                key={school.id}
                onPress={() => {
                  setSchoolId(school.id);
                  setSchoolNome(school.nomeOficial);
                }}
              >
                <VehicleCard>
                  <Text style={{ color: theme.colors.text }}>{school.nomeOficial}</Text>
                  <Text style={{ color: theme.colors.textMuted }}>
                    {school.cidade}/{school.estado}
                  </Text>
                </VehicleCard>
              </Pressable>
            ))}
          </View>
        </>
      )}

      <Text style={[styles.secao, { color: theme.colors.text }]}>Turno</Text>
      <View style={styles.chipsRow}>
        {TURNOS.map((value) => (
          <VehicleButton
            key={value}
            label={SCHOOL_SHIFT_LABEL[value]}
            variant={turno === value ? "primary" : "secondary"}
            onPress={() => setTurno(value)}
          />
        ))}
      </View>

      <Text style={[styles.secao, { color: theme.colors.text }]}>Endereço de embarque</Text>
      <EnderecoFields value={embarque} onChange={setEmbarque} />

      <Text style={[styles.secao, { color: theme.colors.text }]}>Endereço de desembarque</Text>
      <VehicleButton
        label="Usar o mesmo endereço de embarque"
        variant="ghost"
        onPress={() => setDesembarque(embarque)}
      />
      <EnderecoFields value={desembarque} onChange={setDesembarque} />

      <Text style={[styles.secao, { color: theme.colors.text }]}>Observações (opcional)</Text>
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
        label="Observações gerais"
        value={observacoes}
        onChangeText={setObservacoes}
        multiline
      />

      {errorMessage ? <Text style={{ color: theme.colors.danger }}>{errorMessage}</Text> : null}

      <VehicleButton
        label="Cadastrar aluno"
        onPress={() => void handleSalvar()}
        disabled={!podeEnviar}
        isLoading={createStudent.isPending}
      />
    </VehicleScreen>
  );
}

const styles = StyleSheet.create({
  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  lista: { gap: 8 },
  secao: { fontSize: 15, fontWeight: "700", marginTop: 8 },
});

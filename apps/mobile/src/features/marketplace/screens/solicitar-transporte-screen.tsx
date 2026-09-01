import {
  ApiError,
  type CreateStudentInput,
  type SchoolShift,
  type StudentSex,
} from "@rotta/api-client";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";


import { useGeocodeAddress } from "../hooks/use-geocode-address";
import { useLocation } from "../hooks/use-location";
import { useSchoolsSearch } from "../hooks/use-school-picker";
import { useStudentsList } from "../hooks/use-students";
import { useCreateTransportRequest } from "../hooks/use-transport-requests";

import type { ParentTabParamList, MarketplaceStackParamList } from "@/navigation/types";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import {
  StatusPill,
  VehicleButton,
  VehicleCard,
  VehicleScreen,
  VehicleTextField,
} from "@/features/vehicles/components";
import { useTheme } from "@/providers/theme-provider";

type Props = NativeStackScreenProps<MarketplaceStackParamList, "SolicitarTransporte">;

type Mode = "escolher" | "novo";

const SEXO_OPTIONS: { value: StudentSex; label: string }[] = [
  { value: "MASCULINO", label: "Masculino" },
  { value: "FEMININO", label: "Feminino" },
  { value: "OUTRO", label: "Outro" },
];

const TURNO_OPTIONS: { value: SchoolShift; label: string }[] = [
  { value: "MANHA", label: "Manhã" },
  { value: "TARDE", label: "Tarde" },
  { value: "INTEGRAL", label: "Integral" },
  { value: "NOITE", label: "Noite" },
  { value: "PERSONALIZADO", label: "Personalizado" },
];

interface EnderecoForm {
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
}

const ENDERECO_VAZIO: EnderecoForm = {
  cep: "",
  logradouro: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  estado: "",
};

/**
 * "Solicitar Transporte" (briefing "Marketplace" §"SOLICITAR TRANSPORTE")
 * — escolhe um aluno já cadastrado do Responsável ou cadastra um novo
 * inline (`CreateTransportRequestInput.novoAluno`), depois envia a
 * solicitação para o transportador (`POST /marketplace/transport-
 * requests`). O backend resolve `schoolId`/`turno` a partir do aluno —
 * aqui só coletamos os dados, nunca duplicamos a validação de negócio.
 *
 * Busca de escola tolerante a erro de digitação + proximidade
 * (`useSchoolsSearch`, mesmo `GET /schools/sugestoes` já usado na web) —
 * ver o achado real no doc de `use-school-picker.ts`.
 */
export function SolicitarTransporteScreen({ route, navigation }: Props): JSX.Element {
  const { theme } = useTheme();
  const { transportadorId } = route.params;

  const { data: studentsData, isLoading: isLoadingStudents } = useStudentsList();
  const createRequest = useCreateTransportRequest();
  // Localização aproximada só pra ordenar a busca de escola por
  // proximidade (nunca bloqueia o cadastro) — mesmo hook/padrão de
  // `MapaScreen`, pedida uma única vez ao entrar na tela.
  const { status: locationStatus, coords, requestLocation } = useLocation();
  useEffect(() => {
    if (locationStatus === "idle") {
      void requestLocation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só a 1ª vez ao entrar na tela.
  }, []);

  const [mode, setMode] = useState<Mode>("escolher");
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

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

  const students = studentsData?.items ?? [];

  const enderecoCompleto = (endereco: EnderecoForm): boolean =>
    endereco.cep.trim().length > 0 &&
    endereco.logradouro.trim().length > 0 &&
    endereco.numero.trim().length > 0 &&
    endereco.bairro.trim().length > 0 &&
    endereco.cidade.trim().length > 0 &&
    endereco.estado.trim().length > 0;

  // Geocodificação em segundo plano (gap corrigido: esta tela nunca
  // preenchia embarqueLatitude/Longitude — só o cadastro pelo site
  // fazia isso). `null` enquanto o endereço ainda não está completo
  // desativa a busca, mesmo critério do Painel Web.
  const embarqueEnderecoTexto = enderecoCompleto(embarque)
    ? `${embarque.logradouro}, ${embarque.numero}, ${embarque.bairro}, ${embarque.cidade}, ${embarque.estado}, ${embarque.cep}`
    : null;
  const desembarqueEnderecoTexto = enderecoCompleto(desembarque)
    ? `${desembarque.logradouro}, ${desembarque.numero}, ${desembarque.bairro}, ${desembarque.cidade}, ${desembarque.estado}, ${desembarque.cep}`
    : null;
  const embarqueGeocoded = useGeocodeAddress(embarqueEnderecoTexto);
  const desembarqueGeocoded = useGeocodeAddress(desembarqueEnderecoTexto);

  const novoAlunoValido =
    nome.trim().length > 0 &&
    dataNascimento.trim().length > 0 &&
    schoolId !== null &&
    enderecoCompleto(embarque) &&
    enderecoCompleto(desembarque);

  const podeEnviar = mode === "escolher" ? selectedStudentId !== null : novoAlunoValido;

  async function handleEnviar(): Promise<void> {
    setErrorMessage(null);
    try {
      if (mode === "escolher" && selectedStudentId) {
        await createRequest.mutateAsync({
          companyId: transportadorId,
          studentId: selectedStudentId,
        });
      } else if (mode === "novo" && schoolId) {
        const novoAluno: CreateStudentInput = {
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
          // Coordenada já geocodificada em segundo plano (`useGeocodeAddress`)
          // — nunca bloqueia o envio se ainda não chegou ou falhou, os
          // campos ficam `undefined` exatamente como antes desta correção.
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
        await createRequest.mutateAsync({ companyId: transportadorId, novoAluno });
      }

      const parentNavigation = navigation.getParent<BottomTabNavigationProp<ParentTabParamList>>();
      parentNavigation?.navigate("Transporte");
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError ? error.message : "Erro inesperado ao enviar a solicitação.",
      );
    }
  }

  return (
    <VehicleScreen>
      <Text style={[styles.titulo, { color: theme.colors.text }]}>Solicitar Transporte</Text>

      <View style={styles.modoRow}>
        <VehicleButton
          label="Aluno já cadastrado"
          variant={mode === "escolher" ? "primary" : "secondary"}
          onPress={() => setMode("escolher")}
        />
        <VehicleButton
          label="Cadastrar novo aluno"
          variant={mode === "novo" ? "primary" : "secondary"}
          onPress={() => setMode("novo")}
        />
      </View>

      {mode === "escolher" ? (
        isLoadingStudents ? (
          <ActivityIndicator color={theme.colors.primary} />
        ) : students.length === 0 ? (
          <Text style={{ color: theme.colors.textMuted }}>
            Você ainda não tem alunos cadastrados. Use &ldquo;Cadastrar novo aluno&rdquo; acima.
          </Text>
        ) : (
          <View style={styles.lista}>
            {students.map((student) => (
              <Pressable key={student.id} onPress={() => setSelectedStudentId(student.id)}>
                <VehicleCard
                  style={
                    selectedStudentId === student.id
                      ? [styles.cardSelecionado, { borderColor: theme.colors.primary }]
                      : undefined
                  }
                >
                  <Text style={[styles.nomeAluno, { color: theme.colors.text }]}>
                    {student.nome}
                  </Text>
                  {selectedStudentId === student.id ? (
                    <StatusPill label="Selecionado" tone="success" />
                  ) : null}
                </VehicleCard>
              </Pressable>
            ))}
          </View>
        )
      ) : (
        <View style={styles.form}>
          <Text style={[styles.secao, { color: theme.colors.text }]}>Dados do aluno</Text>
          <VehicleTextField label="Nome completo" value={nome} onChangeText={setNome} />
          <VehicleTextField
            label="Data de nascimento (AAAA-MM-DD)"
            value={dataNascimento}
            onChangeText={setDataNascimento}
            placeholder="ex: 2015-03-20"
          />
          <View style={styles.chipsRow}>
            {SEXO_OPTIONS.map((option) => (
              <VehicleButton
                key={option.value}
                label={option.label}
                variant={sexo === option.value ? "primary" : "secondary"}
                onPress={() => setSexo(option.value)}
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
            {TURNO_OPTIONS.map((option) => (
              <VehicleButton
                key={option.value}
                label={option.label}
                variant={turno === option.value ? "primary" : "secondary"}
                onPress={() => setTurno(option.value)}
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
        </View>
      )}

      {errorMessage ? <Text style={{ color: theme.colors.danger }}>{errorMessage}</Text> : null}

      <VehicleButton
        label="Enviar solicitação"
        onPress={() => void handleEnviar()}
        disabled={!podeEnviar}
        isLoading={createRequest.isPending}
      />
    </VehicleScreen>
  );
}

function EnderecoFields({
  value,
  onChange,
}: {
  value: EnderecoForm;
  onChange: (value: EnderecoForm) => void;
}): JSX.Element {
  function setField(field: keyof EnderecoForm, text: string): void {
    onChange({ ...value, [field]: text });
  }

  return (
    <>
      <VehicleTextField
        label="CEP"
        value={value.cep}
        onChangeText={(text) => setField("cep", text)}
        keyboardType="numeric"
      />
      <VehicleTextField
        label="Rua"
        value={value.logradouro}
        onChangeText={(text) => setField("logradouro", text)}
      />
      <VehicleTextField
        label="Número"
        value={value.numero}
        onChangeText={(text) => setField("numero", text)}
        keyboardType="numeric"
      />
      <VehicleTextField
        label="Complemento (opcional)"
        value={value.complemento}
        onChangeText={(text) => setField("complemento", text)}
      />
      <VehicleTextField
        label="Bairro"
        value={value.bairro}
        onChangeText={(text) => setField("bairro", text)}
      />
      <VehicleTextField
        label="Cidade"
        value={value.cidade}
        onChangeText={(text) => setField("cidade", text)}
      />
      <VehicleTextField
        label="Estado (UF)"
        value={value.estado}
        onChangeText={(text) => setField("estado", text)}
        maxLength={2}
      />
    </>
  );
}

const styles = StyleSheet.create({
  cardSelecionado: { borderWidth: 2 },
  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  form: { gap: 12 },
  lista: { gap: 8 },
  modoRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  nomeAluno: { fontWeight: "600" },
  secao: { fontSize: 15, fontWeight: "700", marginTop: 8 },
  titulo: { fontSize: 18, fontWeight: "700" },
});

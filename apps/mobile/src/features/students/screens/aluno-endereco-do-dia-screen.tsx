import { ApiError, type StudentAddressOverrideTrecho } from "@rotta/api-client";
import { useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import {
  useRemoveStudentAddressOverride,
  useStudentAddressOverrides,
  useUpsertStudentAddressOverride,
} from "../hooks/use-students";

import type { ParentPerfilStackParamList } from "@/navigation/types";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { useGeocodeAddress } from "@/features/marketplace/hooks/use-geocode-address";
import {
  ENDERECO_VAZIO,
  EnderecoFields,
  enderecoCompleto,
  enderecoParaGeocodificar,
  type EnderecoForm,
} from "@/features/students/components/endereco-fields";
import { STUDENT_ADDRESS_OVERRIDE_TRECHO_LABEL } from "@/features/students/labels";
import {
  VehicleButton,
  VehicleCard,
  VehicleScreen,
  VehicleTextField,
} from "@/features/vehicles/components";
import { useTheme } from "@/providers/theme-provider";

type Props = NativeStackScreenProps<ParentPerfilStackParamList, "AlunoEnderecoDoDia">;

const TRECHOS = Object.keys(
  STUDENT_ADDRESS_OVERRIDE_TRECHO_LABEL,
) as StudentAddressOverrideTrecho[];

/**
 * "Endereço do dia" (Frente 2 — pedido do usuário: "informar se algum
 * dia ele irá para outro endereço... na ida, na volta ou ambos").
 * Versão mobile simplificada da Web (que usa um calendário mensal de
 * verdade): aqui é lista de desvios já cadastrados + formulário de
 * novo desvio por data digitada — mesma capacidade, sem grade de
 * calendário (economiza uma dependência nova só pra isso). O backend
 * já bloqueia criar/editar/remover depois que a viagem do dia começa —
 * esta tela não duplica essa validação, só mostra o erro que vier.
 */
export function AlunoEnderecoDoDiaScreen({ route }: Props): JSX.Element {
  const { theme } = useTheme();
  const { studentId } = route.params;
  const { data: overrides, isLoading, isError, refetch } = useStudentAddressOverrides(studentId);
  const upsertOverride = useUpsertStudentAddressOverride(studentId);
  const removeOverride = useRemoveStudentAddressOverride(studentId);

  const [data, setData] = useState("");
  const [trecho, setTrecho] = useState<StudentAddressOverrideTrecho>("AMBOS");
  const [endereco, setEndereco] = useState<EnderecoForm>(ENDERECO_VAZIO);
  const [observacao, setObservacao] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const geocoded = useGeocodeAddress(enderecoParaGeocodificar(endereco));

  const podeSalvar =
    data.trim().length === 10 && enderecoCompleto(endereco) && geocoded.coordenada !== null;

  async function handleSalvar(): Promise<void> {
    if (!geocoded.coordenada) return;
    setErrorMessage(null);
    try {
      await upsertOverride.mutateAsync({
        data,
        trecho,
        cep: endereco.cep,
        logradouro: endereco.logradouro,
        numero: endereco.numero,
        complemento: endereco.complemento || undefined,
        bairro: endereco.bairro,
        cidade: endereco.cidade,
        estado: endereco.estado,
        latitude: geocoded.coordenada.latitude,
        longitude: geocoded.coordenada.longitude,
        observacao: observacao || undefined,
      });
      setData("");
      setEndereco(ENDERECO_VAZIO);
      setObservacao("");
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError ? error.message : "Erro inesperado ao salvar o endereço do dia.",
      );
    }
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
          Não foi possível carregar os endereços do dia.
        </Text>
        <VehicleButton label="Tentar novamente" onPress={() => void refetch()} />
      </VehicleScreen>
    );
  }

  return (
    <VehicleScreen>
      <Text style={{ color: theme.colors.textMuted, fontWeight: "600", fontSize: 14 }}>
        Já cadastrados
      </Text>
      {!overrides || overrides.length === 0 ? (
        <Text style={{ color: theme.colors.textMuted }}>Nenhum endereço do dia cadastrado.</Text>
      ) : (
        overrides.map((item) => (
          <VehicleCard key={item.id} style={styles.card}>
            <View style={styles.linha}>
              <Text style={{ color: theme.colors.text, fontWeight: "600" }}>
                {new Date(`${item.data}T00:00:00`).toLocaleDateString("pt-BR")}
              </Text>
              <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>
                {STUDENT_ADDRESS_OVERRIDE_TRECHO_LABEL[item.trecho]}
              </Text>
            </View>
            <Text style={{ color: theme.colors.textMuted, fontSize: 14 }}>
              {item.logradouro}, {item.numero}, {item.bairro}, {item.cidade}/{item.estado}
            </Text>
            <VehicleButton
              label="Remover"
              variant="danger"
              isLoading={removeOverride.isPending && removeOverride.variables === item.id}
              onPress={() => removeOverride.mutate(item.id)}
            />
          </VehicleCard>
        ))
      )}

      <VehicleCard style={styles.card}>
        <Text style={{ color: theme.colors.textMuted, fontWeight: "600", fontSize: 14 }}>
          Novo endereço do dia
        </Text>
        <VehicleTextField
          label="Data (AAAA-MM-DD)"
          value={data}
          onChangeText={setData}
          placeholder="ex: 2026-09-20"
        />
        <View style={styles.chips}>
          {TRECHOS.map((value) => (
            <VehicleButton
              key={value}
              label={STUDENT_ADDRESS_OVERRIDE_TRECHO_LABEL[value]}
              variant={trecho === value ? "primary" : "secondary"}
              onPress={() => setTrecho(value)}
            />
          ))}
        </View>
        <EnderecoFields value={endereco} onChange={setEndereco} />
        <VehicleTextField
          label="Observação (opcional)"
          value={observacao}
          onChangeText={setObservacao}
        />
        {errorMessage ? <Text style={{ color: theme.colors.danger }}>{errorMessage}</Text> : null}
        <VehicleButton
          label="Salvar endereço do dia"
          disabled={!podeSalvar}
          isLoading={upsertOverride.isPending || geocoded.isGeocoding}
          onPress={() => void handleSalvar()}
        />
      </VehicleCard>
    </VehicleScreen>
  );
}

const styles = StyleSheet.create({
  card: { gap: 8 },
  center: { alignItems: "center", flex: 1, justifyContent: "center" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  linha: { alignItems: "center", flexDirection: "row", gap: 8, justifyContent: "space-between" },
});

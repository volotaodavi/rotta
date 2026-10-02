import { ApiError, type ConverterAutonomoInput } from "@rotta/api-client";
import { useAuth } from "@rotta/auth/native";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import type { VinculoPendenteStackParamList } from "@/navigation/types";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { VehicleButton, VehicleScreen, VehicleTextField } from "@/features/vehicles/components";
import { useCepLookup } from "@/hooks/use-cep-lookup";
import { companiesApi } from "@/lib/api-client";
import { useTheme } from "@/providers/theme-provider";

type Props = NativeStackScreenProps<VinculoPendenteStackParamList, "ConverterEmTransportadora">;

const INITIAL_STATE: ConverterAutonomoInput = {
  cep: "",
  endereco: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  estado: "",
  nomeFantasia: "",
};

/**
 * "Trabalho por conta própria": o autônomo/MEI virando a própria
 * transportadora SEM recadastro (`POST /companies/me/autonomo`).
 *
 * Por que é um formulário e não um botão só: `registerAutonomo` nunca
 * coletou endereço, e `Company` exige CEP/endereço/número/bairro/
 * cidade/estado como obrigatórios. Nome, e-mail, telefone e CPF o
 * backend lê da conta autenticada, então não aparecem aqui — pedir de
 * novo seria o recadastro que esta tela existe para evitar.
 *
 * Antes desta tela, a saída oferecida era "saia e escolha Sou
 * transportadora": sair significava criar uma conta nova do zero, com o
 * mesmo e-mail e o mesmo CPF já em uso, e refazer a verificação de
 * identidade. Espelho de `apps/web/.../converter-em-transportadora-form.tsx`.
 */
export function ConverterEmTransportadoraScreen({ navigation: _navigation }: Props): JSX.Element {
  const { theme } = useTheme();
  const { user, logout } = useAuth();
  const cepLookup = useCepLookup();
  const [form, setForm] = useState<ConverterAutonomoInput>(INITIAL_STATE);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const converter = useMutation({
    mutationFn: (input: ConverterAutonomoInput) => companiesApi.converterAutonomo(input),
  });

  function updateField<K extends keyof ConverterAutonomoInput>(
    key: K,
    value: ConverterAutonomoInput[K],
  ): void {
    setForm((atual) => ({ ...atual, [key]: value }));
  }

  async function handleCepPreenchido(cep: string): Promise<void> {
    const endereco = await cepLookup.lookup(cep);
    if (!endereco) return;
    setForm((atual) => ({
      ...atual,
      endereco: endereco.endereco || atual.endereco,
      bairro: endereco.bairro || atual.bairro,
      cidade: endereco.cidade || atual.cidade,
      estado: endereco.estado || atual.estado,
    }));
  }

  function handleSubmit(): void {
    setErrorMessage(null);
    converter.mutate(form, {
      onError: (causa) => {
        setErrorMessage(
          causa instanceof ApiError
            ? causa.message
            : "Não foi possível criar sua transportadora agora. Tente de novo.",
        );
      },
    });
  }

  const camposObrigatoriosPreenchidos =
    form.cep.trim() !== "" &&
    form.endereco.trim() !== "" &&
    form.numero.trim() !== "" &&
    form.bairro.trim() !== "" &&
    form.cidade.trim() !== "" &&
    form.estado.trim().length === 2;

  /*
    A sessão em memória não sabe da empresa nova (o token só ganha
    `companyId` no próximo login), então em vez de tentar um refresh
    mágico de sessão a tela pede o que o resto do app já pede nessa
    situação: entrar de novo.
  */
  if (converter.isSuccess) {
    return (
      <VehicleScreen>
        <Text style={[styles.titulo, { color: theme.colors.text }]}>Transportadora criada</Text>
        <Text style={{ color: theme.colors.textMuted }}>
          {converter.data.nomeFantasia} já é sua, {user?.nome?.split(" ")[0] ?? ""}. Entre novamente
          para usar o app como transportadora.
        </Text>
        <VehicleButton label="Entrar novamente" onPress={() => void logout()} />
      </VehicleScreen>
    );
  }

  return (
    <VehicleScreen>
      <Text style={[styles.titulo, { color: theme.colors.text }]}>Minha transportadora</Text>
      <Text style={{ color: theme.colors.textMuted }}>
        Autônomo e MEI são a própria transportadora, sem código de ninguém. Sua conta, seu CPF e sua
        verificação de identidade continuam as mesmas: falta só o endereço, que toda transportadora
        precisa ter.
      </Text>

      <VehicleTextField
        label="Nome da sua transportadora (opcional)"
        value={form.nomeFantasia ?? ""}
        onChangeText={(text) => updateField("nomeFantasia", text)}
        placeholder="ex: Van do Danilo"
      />

      <VehicleTextField
        label="CEP"
        value={form.cep}
        onChangeText={(text) => {
          updateField("cep", text);
          if (text.replace(/\D/g, "").length === 8) {
            void handleCepPreenchido(text);
          }
        }}
        placeholder="00000-000"
        keyboardType="number-pad"
      />
      {cepLookup.isLoading ? (
        <Text style={[styles.nota, { color: theme.colors.textMuted }]}>Buscando endereço…</Text>
      ) : cepLookup.notFound ? (
        <Text style={[styles.nota, { color: theme.colors.textMuted }]}>
          CEP não encontrado. Preencha os campos abaixo na mão.
        </Text>
      ) : null}

      <VehicleTextField
        label="Endereço"
        value={form.endereco}
        onChangeText={(text) => updateField("endereco", text)}
      />

      <View style={styles.linha}>
        <View style={styles.coluna}>
          <VehicleTextField
            label="Número"
            value={form.numero}
            onChangeText={(text) => updateField("numero", text)}
          />
        </View>
        <View style={styles.coluna}>
          <VehicleTextField
            label="Complemento"
            value={form.complemento ?? ""}
            onChangeText={(text) => updateField("complemento", text)}
          />
        </View>
      </View>

      <VehicleTextField
        label="Bairro"
        value={form.bairro}
        onChangeText={(text) => updateField("bairro", text)}
      />

      <View style={styles.linha}>
        <View style={styles.coluna}>
          <VehicleTextField
            label="Cidade"
            value={form.cidade}
            onChangeText={(text) => updateField("cidade", text)}
          />
        </View>
        <View style={styles.colunaUf}>
          <VehicleTextField
            label="UF"
            value={form.estado}
            onChangeText={(text) => updateField("estado", text.toUpperCase().slice(0, 2))}
            placeholder="RJ"
            autoCapitalize="characters"
          />
        </View>
      </View>

      {errorMessage ? <Text style={{ color: theme.colors.danger }}>{errorMessage}</Text> : null}

      <VehicleButton
        label="Criar minha transportadora"
        disabled={!camposObrigatoriosPreenchidos || converter.isPending}
        isLoading={converter.isPending}
        onPress={handleSubmit}
      />
    </VehicleScreen>
  );
}

const styles = StyleSheet.create({
  coluna: { flex: 1 },
  colunaUf: { width: 90 },
  linha: { flexDirection: "row", gap: 12 },
  nota: { fontSize: 12 },
  titulo: { fontSize: 20, fontWeight: "700" },
});

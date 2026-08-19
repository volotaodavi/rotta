import { ApiError, type RegisterAutonomoInput } from "@rotta/api-client";
import { useAuth } from "@rotta/auth/native";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { AuthButton, AuthScreen, AuthTermsCheckbox, AuthTextField } from "../components";

import type { AuthStackParamList } from "@/navigation/types";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { useTheme } from "@/providers/theme-provider";

type Props = NativeStackScreenProps<AuthStackParamList, "CriarContaAutonomo">;

type PapelAutonomo = RegisterAutonomoInput["role"];

/**
 * Cadastro self-service de Motorista/Monitor autônomo (Frente N,
 * briefing item 9 — "criar conta, Didit, informar o número [código
 * único da transportadora] e se integrar como monitor"), SEM
 * `Company`/`Membership` ainda (`AuthProvider.registerAutonomo`,
 * `POST /auth/register/autonomo`). Depois de entrar, `RootNavigator`
 * mostra `VinculoPendenteNavigator` em vez de `DriverNavigator` até um
 * pedido de vínculo (`CompanyJoinRequest`) ser aprovado pela empresa —
 * é lá que a Didit e o código são pedidos, um passo de cada vez.
 */
export function CriarContaAutonomoScreen({ navigation: _navigation }: Props): JSX.Element {
  const { theme } = useTheme();
  const { registerAutonomo } = useAuth();

  const [papel, setPapel] = useState<PapelAutonomo>("motorista");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [cpf, setCpf] = useState("");
  const [senha, setSenha] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [aceitouTermos, setAceitouTermos] = useState(false);

  async function handleSubmit(): Promise<void> {
    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      await registerAutonomo({
        nome,
        email,
        telefone,
        cpf,
        senha,
        role: papel,
        aceiteTermos: true,
      });
      // RootNavigator troca para VinculoPendenteNavigator sozinho assim que `status` vira "authenticated".
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError ? error.message : "Erro inesperado ao criar sua conta.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthScreen>
      <Text
        style={[
          styles.title,
          { color: theme.colors.text, fontSize: theme.typography.title.fontSize },
        ]}
      >
        Motorista ou monitor autônomo
      </Text>
      <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>
        Crie sua conta, complete a verificação de identidade e informe o código da transportadora
        pra pedir vínculo, sem precisar de um convite dela.
      </Text>

      <Text style={[styles.fieldLabel, { color: theme.colors.text }]}>Você é</Text>
      <View style={styles.papelRow}>
        <View style={styles.papelOption}>
          <AuthButton
            label="Motorista"
            variant={papel === "motorista" ? "primary" : "secondary"}
            onPress={() => setPapel("motorista")}
          />
        </View>
        <View style={styles.papelOption}>
          <AuthButton
            label="Monitor"
            variant={papel === "monitor" ? "primary" : "secondary"}
            onPress={() => setPapel("monitor")}
          />
        </View>
      </View>

      <AuthTextField label="Nome completo" value={nome} onChangeText={setNome} />
      <AuthTextField
        label="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <AuthTextField
        label="Telefone"
        keyboardType="phone-pad"
        value={telefone}
        onChangeText={setTelefone}
      />
      <AuthTextField label="CPF" keyboardType="number-pad" value={cpf} onChangeText={setCpf} />
      <AuthTextField
        label="Senha"
        secureTextEntry
        helperText="Mínimo 8 caracteres, com ao menos 1 letra e 1 número."
        value={senha}
        onChangeText={setSenha}
      />

      <AuthTermsCheckbox checked={aceitouTermos} onChange={setAceitouTermos} />

      {errorMessage ? (
        <Text style={[styles.error, { color: theme.colors.danger }]}>{errorMessage}</Text>
      ) : null}

      <AuthButton
        label="Criar conta"
        onPress={() => void handleSubmit()}
        isLoading={isSubmitting}
        disabled={!aceitouTermos}
      />
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  error: { fontSize: 13 },
  fieldLabel: { fontSize: 14, fontWeight: "600", marginBottom: 8 },
  papelOption: { flex: 1 },
  papelRow: { flexDirection: "row", gap: 12, marginBottom: 8 },
  subtitle: { fontSize: 14, lineHeight: 20, marginBottom: 8 },
  title: { fontWeight: "600", marginBottom: 4 },
});

import { ApiError } from "@rotta/api-client";
import { useAuth } from "@rotta/auth/native";
import { useState } from "react";
import { StyleSheet, Text } from "react-native";

import { AuthButton, AuthScreen, AuthTextField } from "../components";

import type { AuthStackParamList } from "@/navigation/types";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { useTheme } from "@/providers/theme-provider";

type Props = NativeStackScreenProps<AuthStackParamList, "CriarContaPessoal">;

/**
 * Cadastro self-service da Área Pessoal (Responsável) — cria a conta
 * diretamente, sem exigir um código de convite (`AuthProvider.registerPessoal`,
 * `POST /auth/register/pessoal`). Quem já tem um código de uma escola/empresa
 * continua podendo usá-lo em `ConviteCodigo`; esta tela é a porta de entrada
 * padrão para quem ainda não recebeu nenhum convite.
 */
export function CriarContaPessoalScreen({ navigation }: Props): JSX.Element {
  const { theme } = useTheme();
  const { registerPessoal } = useAuth();

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [cpf, setCpf] = useState("");
  const [senha, setSenha] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(): Promise<void> {
    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      await registerPessoal({ nome, email, telefone, cpf, senha, aceiteTermos: true });
      // RootNavigator troca de tela sozinho assim que `status` vira "authenticated".
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
        Criar conta
      </Text>
      <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>
        Depois de entrar, você cadastra seus filhos e busca transportadores no Marketplace.
      </Text>

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
        helperText="Mínimo 8 caracteres, com letra maiúscula, número e símbolo."
        value={senha}
        onChangeText={setSenha}
      />

      {errorMessage ? (
        <Text style={[styles.error, { color: theme.colors.danger }]}>{errorMessage}</Text>
      ) : null}

      <AuthButton
        label="Criar conta"
        onPress={() => void handleSubmit()}
        isLoading={isSubmitting}
      />

      <Text
        style={[styles.footerLink, { color: theme.colors.primary }]}
        onPress={() => navigation.navigate("ConviteCodigo")}
      >
        Tenho um código de convite
      </Text>
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  error: { fontSize: 13 },
  footerLink: { fontSize: 14, fontWeight: "600", marginTop: 4, textAlign: "center" },
  subtitle: { fontSize: 14, lineHeight: 20, marginBottom: 8 },
  title: { fontWeight: "600", marginBottom: 4 },
});

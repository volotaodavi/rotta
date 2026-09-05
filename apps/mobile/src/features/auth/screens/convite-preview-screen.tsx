import { ApiError } from "@rotta/api-client";
import { useAuth } from "@rotta/auth/native";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import {
  AuthButton,
  AuthScreen,
  AuthTermsCheckbox,
  AuthTextField,
  PasswordInput,
} from "../components";

import type { AuthStackParamList } from "@/navigation/types";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { authApi } from "@/lib/api-client";
import { useTheme } from "@/providers/theme-provider";

type Props = NativeStackScreenProps<AuthStackParamList, "ConvitePreview">;

const ROLE_LABEL: Record<string, string> = {
  gestor: "Gestor",
  motorista: "Motorista",
  monitor: "Monitor",
  responsavel: "Responsável",
  escola: "Escola",
};

/**
 * Resgate de convite (Dossiê 15, `AUTH-01-A1`) — "Confirmar identidade ->
 * Completar cadastro -> Entrar normalmente". Nunca cria uma nova empresa:
 * o vínculo é anexado ao tenant que já existe. Equivalente móvel de
 * `apps/web` `(auth)/convite/[codigo]`.
 */
export function ConvitePreviewScreen({ route }: Props): JSX.Element {
  const { codigo } = route.params;
  const { theme } = useTheme();
  const { redeemInvite } = useAuth();

  const {
    data: preview,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["invite-preview", codigo],
    queryFn: () => authApi.previewInvite(codigo),
    retry: false,
  });

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
      await redeemInvite({ codigo, nome, email, telefone, cpf, senha, aceiteTermos: true });
      // RootNavigator troca de tela sozinho assim que `status` vira "authenticated".
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError ? error.message : "Erro inesperado ao completar o cadastro.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  if (isError || !preview) {
    return (
      <AuthScreen>
        <Text
          style={[
            styles.title,
            { color: theme.colors.text, fontSize: theme.typography.title.fontSize },
          ]}
        >
          Convite inválido
        </Text>
        <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>
          Este código não existe, expirou ou já foi utilizado. Peça um novo convite.
        </Text>
      </AuthScreen>
    );
  }

  return (
    <AuthScreen>
      <Text
        style={[
          styles.title,
          { color: theme.colors.text, fontSize: theme.typography.title.fontSize },
        ]}
      >
        Complete seu cadastro
      </Text>
      <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>
        Convite de {preview.companyName} para atuar como {ROLE_LABEL[preview.role] ?? preview.role}.
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
      <PasswordInput
        label="Senha"
        helperText="Se você já tem uma conta Rotta, informe a senha dela para vincular este convite."
        value={senha}
        onChangeText={setSenha}
      />

      <AuthTermsCheckbox checked={aceitouTermos} onChange={setAceitouTermos} />

      {errorMessage ? (
        <Text style={[styles.error, { color: theme.colors.danger }]}>{errorMessage}</Text>
      ) : null}

      <AuthButton
        label="Entrar"
        onPress={() => void handleSubmit()}
        isLoading={isSubmitting}
        disabled={!aceitouTermos}
      />
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center", flex: 1, justifyContent: "center" },
  error: { fontSize: 13 },
  subtitle: { fontSize: 14, lineHeight: 20, marginBottom: 8 },
  title: { fontWeight: "600", marginBottom: 4 },
});

import { ApiError } from "@rotta/api-client";
import { MailCheck } from "@rotta/icons/native";
import { useState } from "react";
import { StyleSheet, Text } from "react-native";


import { AuthButton, AuthHeaderScreen, AuthStatusBadge, AuthTextField } from "../components";

import type { AuthStackParamList } from "@/navigation/types";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { authApi } from "@/lib/api-client";
import { useTheme } from "@/providers/theme-provider";

type Props = NativeStackScreenProps<AuthStackParamList, "EsqueciSenha">;

/**
 * "Esqueci minha senha" (Dossiê 15, `AUTH-03`) — faltava por completo
 * no app (o backend já tinha `POST /auth/forgot-password`, mas nenhuma
 * tela em nenhum dos 3 apps chamava). Só pede o e-mail e confirma o
 * envio (resposta sempre igual, exista ou não a conta — `RN-AUTH-03`,
 * mesma garantia do backend); a troca de senha em si acontece pelo link
 * do e-mail, que abre no navegador do celular (`WEB_APP_URL/
 * redefinir-senha?token=...`) — sem precisar de deep link de volta pro
 * app pra este primeiro lançamento.
 *
 * Redesign 15/09/2026 — ver nota em `login-screen.tsx`. O estado
 * "enviado" ganha `AuthStatusBadge` no lugar da ilustração do print de
 * referência (ver nota de fallback ali).
 */
export function EsqueciSenhaScreen({ navigation }: Props): JSX.Element {
  const { theme } = useTheme();
  const [email, setEmail] = useState("");
  const [enviado, setEnviado] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(): Promise<void> {
    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      await authApi.forgotPassword(email);
      setEnviado(true);
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError ? error.message : "Erro inesperado. Tente novamente.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (enviado) {
    return (
      <AuthHeaderScreen title="Verifique seu e-mail" onBack={() => navigation.goBack()}>
        <AuthStatusBadge icon={MailCheck} />
        <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>
          Se houver uma conta com o e-mail {email}, enviamos um link para redefinir a senha. Confira
          também a caixa de spam.
        </Text>
        <AuthButton
          label="Voltar para o login"
          variant="ghost"
          onPress={() => navigation.goBack()}
        />
      </AuthHeaderScreen>
    );
  }

  return (
    <AuthHeaderScreen
      title="Esqueceu sua senha?"
      subtitle="Informe o e-mail da sua conta e enviaremos um link para redefinir a senha."
      onBack={() => navigation.goBack()}
    >
      <AuthTextField
        label="E-mail"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />

      {errorMessage ? (
        <Text style={[styles.error, { color: theme.colors.danger }]}>{errorMessage}</Text>
      ) : null}

      <AuthButton
        label="Enviar link de redefinição"
        onPress={() => void handleSubmit()}
        isLoading={isSubmitting}
      />
    </AuthHeaderScreen>
  );
}

const styles = StyleSheet.create({
  error: { fontSize: 13 },
  subtitle: { fontSize: 14, lineHeight: 20, textAlign: "center" },
});

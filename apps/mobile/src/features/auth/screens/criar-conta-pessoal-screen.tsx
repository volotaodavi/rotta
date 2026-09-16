import { ApiError } from "@rotta/api-client";
import { useAuth } from "@rotta/auth/native";
import { Lock, Mail, Phone, User } from "@rotta/icons/native";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import {
  AuthButton,
  AuthScreen,
  AuthTermsCheckbox,
  AuthTextField,
  PasswordInput,
} from "../components";

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
 *
 * SEM campo de CPF (removido 14/09/2026, pedido do usuário: "para os
 * responsáveis não pegamos esses dados, apenas o nome e telefone" —
 * decisão final: manter e-mail, remover só CPF).
 *
 * Redesign 15/09/2026 — print real da Rotta anexado pelo usuário; troca
 * o cabeçalho curvo colorido usado antes (`AuthHeaderScreen`, print
 * genérico de outro app) pelo mesmo visual plano do Login (ver nota em
 * `login-screen.tsx`).
 */
export function CriarContaPessoalScreen({ navigation }: Props): JSX.Element {
  const { theme } = useTheme();
  const { registerPessoal } = useAuth();

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [senha, setSenha] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [aceitouTermos, setAceitouTermos] = useState(false);

  async function handleSubmit(): Promise<void> {
    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      await registerPessoal({ nome, email, telefone, senha, aceiteTermos: true });
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
      <View style={styles.headingBlock}>
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
      </View>

      <AuthTextField
        label="Nome completo"
        value={nome}
        onChangeText={setNome}
        leftIcon={<User size={18} color={theme.colors.textMuted} />}
      />
      <AuthTextField
        label="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        leftIcon={<Mail size={18} color={theme.colors.textMuted} />}
      />
      <AuthTextField
        label="Telefone"
        keyboardType="phone-pad"
        value={telefone}
        onChangeText={setTelefone}
        leftIcon={<Phone size={18} color={theme.colors.textMuted} />}
      />
      <PasswordInput
        label="Senha"
        helperText="Mínimo 8 caracteres, com ao menos 1 letra e 1 número."
        value={senha}
        onChangeText={setSenha}
        leftIcon={<Lock size={18} color={theme.colors.textMuted} />}
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
  error: { fontSize: 14, textAlign: "center" },
  footerLink: { fontSize: 14, fontWeight: "600", marginTop: 4, textAlign: "center" },
  headingBlock: { gap: 4, marginBottom: 4 },
  subtitle: { fontSize: 14, lineHeight: 20 },
  title: { fontWeight: "700" },
});

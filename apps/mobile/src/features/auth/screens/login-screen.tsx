import {
  ApiError,
  isMfaChallengeResponse,
  isMfaSetupRequiredResponse,
  isProfileSelectionResponse,
  type ProfileOption,
} from "@rotta/api-client";
import { useAuth } from "@rotta/auth/native";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { AuthButton, AuthScreen, AuthTextField } from "../components";

import type { AuthStackParamList } from "@/navigation/types";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { useTheme } from "@/providers/theme-provider";

type Props = NativeStackScreenProps<AuthStackParamList, "Login">;

const ROLE_LABEL: Record<string, string> = {
  gestor: "Gestor",
  motorista: "Motorista",
  monitor: "Monitor",
  responsavel: "Responsável",
  escola: "Escola",
  empresa: "Administrador",
};

/**
 * Login único (Dossiê 15, `AUTH-01`) — "Aceitar Telefone, Email, CPF +
 * Senha". Mesma conta compartilhada com `apps/web`/`apps/admin`: uma
 * conta criada no Site já funciona aqui, sem novo cadastro.
 */
export function LoginScreen({ navigation }: Props): JSX.Element {
  const { theme } = useTheme();
  const { login, logout } = useAuth();

  const [identificador, setIdentificador] = useState("");
  const [senha, setSenha] = useState("");
  const [profiles, setProfiles] = useState<ProfileOption[] | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleLogin(companyId?: string): Promise<void> {
    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      const result = await login({ identificador, senha, companyId });
      if (isProfileSelectionResponse(result)) {
        setProfiles(result.profiles);
        return;
      }
      // `login()` não devolve mais nenhuma das duas pra ninguém (login
      // nunca mais exige MFA) — guard só por tipo, pra manter o
      // TypeScript feliz sem afirmar `result.user` num branch que não
      // tem `user`.
      if (isMfaSetupRequiredResponse(result) || isMfaChallengeResponse(result)) {
        return;
      }
      // Admin Rotta não tem tela própria neste app (`RootNavigator`) —
      // `login()` acima já persistiu a sessão antes de chegarmos aqui
      // (login não exige mais MFA pra nenhum papel, pedido do usuário
      // em produção), então `logout()` desfaz na hora em vez de deixar
      // um token de Admin Rotta válido guardado no aparelho.
      if (result.user.role === "admin_rotta") {
        await logout();
        setErrorMessage("Esta conta requer o painel administrativo da Rotta para entrar.");
        return;
      }
      // Quando não há seleção de perfil nem conta de Admin Rotta, o
      // RootNavigator troca de tela sozinho assim que `status` vira
      // "authenticated".
    } catch (error) {
      setErrorMessage(error instanceof ApiError ? error.message : "Erro inesperado ao entrar.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (profiles) {
    return (
      <AuthScreen>
        <Text
          style={[
            styles.title,
            { color: theme.colors.text, fontSize: theme.typography.title.fontSize },
          ]}
        >
          Escolha uma empresa
        </Text>
        <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>
          Sua conta está vinculada a mais de uma empresa.
        </Text>
        <View style={styles.profileList}>
          {profiles.map((profile) => (
            <AuthButton
              key={profile.companyId}
              variant="secondary"
              label={`${profile.companyName} — ${ROLE_LABEL[profile.role] ?? profile.role}`}
              onPress={() => void handleLogin(profile.companyId)}
              isLoading={isSubmitting}
            />
          ))}
        </View>
        {errorMessage ? (
          <Text style={[styles.error, { color: theme.colors.danger }]}>{errorMessage}</Text>
        ) : null}
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
        Entrar
      </Text>

      <AuthTextField
        label="Telefone, e-mail ou CPF"
        autoCapitalize="none"
        autoCorrect={false}
        value={identificador}
        onChangeText={setIdentificador}
      />
      <AuthTextField label="Senha" secureTextEntry value={senha} onChangeText={setSenha} />

      {errorMessage ? (
        <Text style={[styles.error, { color: theme.colors.danger }]}>{errorMessage}</Text>
      ) : null}

      <AuthButton label="Entrar" onPress={() => void handleLogin()} isLoading={isSubmitting} />
      <AuthButton
        label="Criar conta"
        variant="ghost"
        onPress={() => navigation.navigate("CriarConta")}
      />
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  error: { fontSize: 13 },
  profileList: { gap: 12, marginTop: 8 },
  subtitle: { fontSize: 14, marginBottom: 8 },
  title: { fontWeight: "600", marginBottom: 8 },
});

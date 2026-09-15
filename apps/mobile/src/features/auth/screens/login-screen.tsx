import {
  ApiError,
  isMfaChallengeResponse,
  isMfaSetupRequiredResponse,
  isProfileSelectionResponse,
  type ProfileOption,
} from "@rotta/api-client";
import { useAuth } from "@rotta/auth/native";
import { Lock, Mail } from "@rotta/icons/native";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { AuthButton, AuthLogoMark, AuthScreen, AuthTextField, PasswordInput } from "../components";

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
 *
 * Redesign 15/09/2026 (pedido do usuário — anexou um print real da
 * Rotta e disse "O UX/UI design deverá seguir o design anexado. A
 * partir de login"): substitui o cabeçalho curvo colorido usado antes
 * (`AuthHeaderScreen`, inspirado num print genérico de outro app) por
 * este layout — fundo branco, lockup do ícone real do app
 * (`AuthLogoMark`) e campos com ícone à esquerda. O botão "Entrar com
 * Google" do print NÃO entra: pesquisei e não existe nenhuma
 * integração OAuth no backend hoje — colocar o botão sem funcionar
 * seria um elemento morto na tela (mesmo raciocínio da foto de aluno
 * removida hoje mais cedo), confirmado com o usuário via
 * AskUserQuestion ("Deixar de fora por enquanto").
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
        <AuthLogoMark />
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
              label={`${profile.companyName} (${ROLE_LABEL[profile.role] ?? profile.role})`}
              onPress={() => void handleLogin(profile.companyId)}
              isLoading={isSubmitting}
            />
          ))}
        </View>
        {errorMessage ? (
          <Text style={[styles.error, { color: theme.colors.danger }]}>{errorMessage}</Text>
        ) : null}
        <AuthButton label="Voltar" variant="ghost" onPress={() => setProfiles(null)} />
      </AuthScreen>
    );
  }

  return (
    <AuthScreen>
      <AuthLogoMark />

      <View style={styles.headingBlock}>
        <Text
          style={[
            styles.title,
            { color: theme.colors.text, fontSize: theme.typography.title.fontSize },
          ]}
        >
          Entrar
        </Text>
        <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>
          Acesse sua conta para continuar.
        </Text>
      </View>

      <AuthTextField
        label="E-mail ou telefone"
        autoCapitalize="none"
        autoCorrect={false}
        value={identificador}
        onChangeText={setIdentificador}
        leftIcon={<Mail size={18} color={theme.colors.textMuted} />}
      />
      <PasswordInput
        label="Senha"
        value={senha}
        onChangeText={setSenha}
        leftIcon={<Lock size={18} color={theme.colors.textMuted} />}
      />

      {errorMessage ? (
        <Text style={[styles.error, { color: theme.colors.danger }]}>{errorMessage}</Text>
      ) : null}

      <AuthButton label="Entrar" onPress={() => void handleLogin()} isLoading={isSubmitting} />

      <Text
        style={[styles.link, { color: theme.colors.primary }]}
        onPress={() => navigation.navigate("EsqueciSenha")}
      >
        Esqueci minha senha
      </Text>

      <Text style={[styles.footer, { color: theme.colors.textMuted }]}>
        Não tem uma conta?{" "}
        <Text
          style={[styles.footerLink, { color: theme.colors.primary }]}
          onPress={() => navigation.navigate("CriarConta")}
        >
          Criar conta
        </Text>
      </Text>
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  error: { fontSize: 13, textAlign: "center" },
  footer: { fontSize: 14, marginTop: 4, textAlign: "center" },
  footerLink: { fontWeight: "700" },
  headingBlock: { gap: 4, marginBottom: 4, marginTop: 8 },
  link: { fontSize: 14, fontWeight: "600", textAlign: "center" },
  profileList: { gap: 12 },
  subtitle: { fontSize: 14 },
  title: { fontWeight: "700" },
});

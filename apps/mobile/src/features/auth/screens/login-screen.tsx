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

import { clientErrorsApi } from "@/lib/api-client";
import { identidadeDoBuild } from "@/lib/identidade-do-build";
import { useTheme } from "@/providers/theme-provider";

type Props = NativeStackScreenProps<AuthStackParamList, "Login">;

/**
 * Manda ao plantão a falha de login que NÃO veio do servidor.
 *
 * ## Por que existe
 *
 * Em 13/10/2026 o fundador recebeu "Erro inesperado ao entrar" com a
 * senha certa. O banco provava que o servidor tinha processado o login
 * (`tentativasLoginFalhas` zerado, linha do usuário atualizada no
 * horário da tentativa), e o plantão de erro não tinha absolutamente
 * nada: este `catch` trocava o erro real por uma frase genérica e
 * seguia adiante.
 *
 * É a mesma cegueira de 06/10, quando a renovação de sessão falhava em
 * silêncio e o plantão mostrou zero erro numa semana com o app
 * inutilizável. A lição se repetiu porque foi aplicada só naquele
 * caminho: **um caminho de falha que o app trata sozinho continua
 * sendo uma falha, e precisa virar registro.**
 *
 * Só reporta o que não é `ApiError`. Senha errada é 401 com texto
 * próprio, é uso normal do produto, e encheria o plantão de ruído.
 *
 * Nunca lança nem atrasa a tela: o `catch` vazio é deliberado, pelo
 * mesmo motivo documentado em `AppErrorBoundary`.
 */
function relatarFalhaDeLogin(erro: unknown): void {
  const alvo = erro instanceof Error ? erro : undefined;
  void clientErrorsApi
    .report({
      app: "MOBILE",
      message: alvo?.message || String(erro) || "Falha de login sem mensagem",
      /* O NOME do erro é o que distingue rede de abort de bug nosso. */
      stack: `${alvo?.name ?? typeof erro}: ${alvo?.stack ?? "(sem stack)"}`,
      path: "Login",
      source: "login-falhou",
      buildId: identidadeDoBuild(),
    })
    .catch(() => undefined);
}

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
      if (error instanceof ApiError) {
        /*
          Resposta do servidor: credencial errada, conta bloqueada,
          tempo esgotado (o cliente HTTP traduz o próprio abort em
          `ApiError` com texto próprio). A mensagem dele já explica o
          que houve, e não é falha da plataforma: nada a reportar.
        */
        setErrorMessage(error.message);
      } else {
        relatarFalhaDeLogin(error);
        /*
          Sem resposta HTTP nenhuma: a conexão caiu no meio. Dizer
          "erro inesperado" aqui é inútil e um pouco desonesto, porque
          nós sabemos a categoria — o que não sabemos é o motivo dela.
          A frase abaixo diz o que aconteceu e o que fazer.
        */
        setErrorMessage(
          "Não foi possível falar com o servidor. Verifique sua conexão e tente de novo.",
        );
      }
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
  error: { fontSize: 14, textAlign: "center" },
  footer: { fontSize: 14, marginTop: 4, textAlign: "center" },
  footerLink: { fontWeight: "700" },
  headingBlock: { gap: 4, marginBottom: 4, marginTop: 8 },
  link: { fontSize: 14, fontWeight: "600", textAlign: "center" },
  profileList: { gap: 12 },
  subtitle: { fontSize: 14 },
  title: { fontWeight: "700" },
});

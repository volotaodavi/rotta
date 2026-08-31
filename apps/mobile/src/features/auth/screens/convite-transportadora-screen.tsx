import { ApiError } from "@rotta/api-client";
import { useAuth } from "@rotta/auth/native";
import { useState } from "react";
import { StyleSheet, Text, TouchableOpacity } from "react-native";


import { AuthButton, AuthScreen, AuthTermsCheckbox, AuthTextField } from "../components";

import type { AuthStackParamList } from "@/navigation/types";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { studentPreRegistrationsApi } from "@/lib/api-client";
import { useTheme } from "@/providers/theme-provider";

type Props = NativeStackScreenProps<AuthStackParamList, "ConviteTransportadora">;

/**
 * Cadastro direto do Responsável via "código da transportadora" — mesmo
 * conceito e mesma API de `apps/web`
 * (`(auth)/convite/_components/convite-transportadora-form.tsx`, Dossiê 26):
 * `Company.codigoInterno`, não um `Invite` (código de convite de equipe,
 * uso único). Alcançada a partir de `ConviteCodigoScreen` — "mesma aba,
 * segmentos diferentes" (pedido do usuário) vira, no app nativo, o mesmo
 * padrão de link no rodapé já usado ali (que aponta pra cá) em vez de um
 * seletor de abas (não existe componente `Tabs` no design system nativo).
 *
 * Duas etapas: (1) código + celular → mostra a transportadora e, se
 * houver, o pré-cadastro batendo; (2) dados do responsável + senha → cria
 * a conta já reivindicando o pré-cadastro (se houver). Ao contrário da
 * web, não navega pra "/alunos/novo" ao final — o `RootNavigator` troca
 * de tela sozinho assim que `status` vira "authenticated" (mesmo padrão
 * de `ConvitePreviewScreen`); o cadastro do aluno fica pro fluxo normal
 * do Responsável dentro do app.
 */
export function ConviteTransportadoraScreen(_props: Props): JSX.Element {
  const { theme } = useTheme();
  const { registerPessoal } = useAuth();

  const [etapa, setEtapa] = useState<"codigo" | "dados">("codigo");
  const [codigoInterno, setCodigoInterno] = useState("");
  const [celular, setCelular] = useState("");
  const [companyName, setCompanyName] = useState<string | null>(null);
  const [match, setMatch] = useState<{
    id: string;
    nomeAluno: string;
    nomeResponsavel: string;
  } | null>(null);

  const [isBuscando, setIsBuscando] = useState(false);
  const [erroBusca, setErroBusca] = useState<string | null>(null);

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [cpf, setCpf] = useState("");
  const [senha, setSenha] = useState("");
  const [aceitouTermos, setAceitouTermos] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [erroCadastro, setErroCadastro] = useState<string | null>(null);

  async function handleBuscar(): Promise<void> {
    setErroBusca(null);

    const codigo = codigoInterno.trim().toUpperCase();
    if (!codigo) {
      setErroBusca("Informe o código da transportadora.");
      return;
    }
    if (celular.trim().length < 10) {
      setErroBusca("Telefone incompleto: digite o DDD e o celular.");
      return;
    }

    setIsBuscando(true);
    try {
      const company = await studentPreRegistrationsApi.previewCompany(codigo);
      if (!company) {
        setErroBusca("Código não encontrado. Confira o código com a transportadora.");
        return;
      }
      setCompanyName(company.companyName);

      const found = await studentPreRegistrationsApi.lookup(codigo, celular);
      if (found) {
        setMatch({
          id: found.id,
          nomeAluno: found.nomeAluno,
          nomeResponsavel: found.nomeResponsavel,
        });
        setNome(found.nomeResponsavel);
      } else {
        setMatch(null);
      }
      setEtapa("dados");
    } catch {
      setErroBusca("Não foi possível verificar esse código agora. Tente novamente.");
    } finally {
      setIsBuscando(false);
    }
  }

  async function handleCadastrar(): Promise<void> {
    setErroCadastro(null);
    setIsSubmitting(true);
    try {
      await registerPessoal({
        nome,
        email,
        telefone: celular,
        cpf,
        senha,
        aceiteTermos: true,
        preRegistrationId: match?.id,
      });
      // RootNavigator troca de tela sozinho assim que `status` vira "authenticated".
    } catch (error) {
      setErroCadastro(
        error instanceof ApiError ? error.message : "Erro inesperado ao completar o cadastro.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (etapa === "codigo") {
    return (
      <AuthScreen>
        <Text
          style={[
            styles.title,
            { color: theme.colors.text, fontSize: theme.typography.title.fontSize },
          ]}
        >
          Entrar com o código da transportadora
        </Text>
        <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>
          Recebeu um código da transportadora do seu filho? Digite ele aqui pra começar o cadastro
          rapidinho.
        </Text>

        <AuthTextField
          label="Código da transportadora"
          autoCapitalize="characters"
          autoCorrect={false}
          placeholder="Ex.: TRN-000001"
          value={codigoInterno}
          onChangeText={setCodigoInterno}
        />
        <AuthTextField
          label="Seu celular"
          keyboardType="phone-pad"
          placeholder="Ex.: (11) 98765-4321"
          value={celular}
          onChangeText={setCelular}
        />

        {erroBusca ? (
          <Text style={[styles.error, { color: theme.colors.danger }]}>{erroBusca}</Text>
        ) : null}

        <AuthButton label="Continuar" isLoading={isBuscando} onPress={() => void handleBuscar()} />
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
      <Text style={[styles.subtitleLong, { color: theme.colors.textMuted }]}>
        Transportadora {companyName}
        {match
          ? ` · aluno ${match.nomeAluno} já pré-cadastrado. Confirme seus dados pra concluir.`
          : " · não encontramos um pré-cadastro com esse celular, então vamos fazer o cadastro completo do zero."}
      </Text>

      <AuthTextField label="Nome completo" value={nome} onChangeText={setNome} />
      <AuthTextField
        label="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <AuthTextField label="CPF" keyboardType="number-pad" value={cpf} onChangeText={setCpf} />
      <AuthTextField
        label="Crie uma senha"
        secureTextEntry
        helperText="Você vai usar essa senha pra acessar tanto o site quanto o app."
        value={senha}
        onChangeText={setSenha}
      />

      <AuthTermsCheckbox checked={aceitouTermos} onChange={setAceitouTermos} />

      {erroCadastro ? (
        <Text style={[styles.error, { color: theme.colors.danger }]}>{erroCadastro}</Text>
      ) : null}

      <AuthButton
        label="Concluir cadastro"
        isLoading={isSubmitting}
        disabled={!aceitouTermos}
        onPress={() => void handleCadastrar()}
      />
      <AuthButton label="Voltar" variant="secondary" onPress={() => setEtapa("codigo")} />
    </AuthScreen>
  );
}

/** Link de rodapé usado em `ConviteCodigoScreen` — extraído aqui só pra reuso do estilo. */
export function ConviteTransportadoraLink({ onPress }: { onPress: () => void }): JSX.Element {
  const { theme } = useTheme();
  return (
    <TouchableOpacity onPress={onPress} accessibilityRole="button">
      <Text style={[styles.linkText, { color: theme.colors.textMuted }]}>
        É responsável e recebeu um código da transportadora (não um convite de equipe)?{" "}
        <Text style={[styles.linkHighlight, { color: theme.colors.primary }]}>
          Cadastre seu filho por aqui
        </Text>
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  error: { fontSize: 13 },
  linkHighlight: { fontWeight: "600" },
  linkText: { fontSize: 12, textAlign: "center" },
  subtitle: { fontSize: 14, marginBottom: 8 },
  subtitleLong: { fontSize: 14, lineHeight: 20, marginBottom: 8 },
  title: { fontWeight: "600", marginBottom: 4 },
});

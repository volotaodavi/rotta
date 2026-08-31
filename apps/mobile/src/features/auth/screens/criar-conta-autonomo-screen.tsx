import { ApiError, type RegisterAutonomoInput } from "@rotta/api-client";
import { useAuth } from "@rotta/auth/native";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { AuthButton, AuthScreen, AuthTermsCheckbox, AuthTextField } from "../components";

import type { AuthStackParamList } from "@/navigation/types";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { studentPreRegistrationsApi } from "@/lib/api-client";
import { useTheme } from "@/providers/theme-provider";

type Props = NativeStackScreenProps<AuthStackParamList, "CriarContaAutonomo">;

type PapelAutonomo = RegisterAutonomoInput["role"];

/**
 * Cadastro self-service de Motorista/Monitor autônomo (Frente N,
 * briefing item 9), SEM `Company`/`Membership` ainda
 * (`AuthProvider.registerAutonomo`, `POST /auth/register/autonomo`).
 *
 * REORDENADO (Frente 9, auditoria 31/08/2026 — pedido do usuário: "o
 * fluxo deverá garantir isso": código da transportadora primeiro,
 * depois dados, depois a conta nasce como continuação de um único
 * fluxo — igual ao que o Responsável já tinha via `codigoInterno`/
 * `preRegistrationId` em `ConviteTransportadoraScreen`, mesmo padrão de
 * 2 etapas espelhado aqui). Antes, o código só era pedido DEPOIS da
 * conta já existir, um passo separado e autenticado
 * (`InformarCodigoVinculoScreen`, dentro de `VinculoPendenteNavigator`)
 * — essa tela continua existindo (ainda é o caminho pra quem pulou o
 * código aqui, ou trocar de transportadora depois), só deixou de ser o
 * ÚNICO caminho.
 *
 * O código continua OPCIONAL nesta etapa (o "Pular" abaixo) — quem
 * prefere criar a conta solta e vincular depois continua podendo.
 * Quando informado, `GET /student-pre-registrations/company-preview`
 * (endpoint público e genérico, mesmo usado pelo Responsável) já
 * confirma a transportadora ANTES de coletar os dados pessoais; o
 * `CompanyJoinRequest` PENDENTE nasce na mesma chamada de
 * `registerAutonomo` (backend, `AuthService`) — a aprovação da empresa
 * continua manual, só a ORDEM do fluxo mudou.
 */
export function CriarContaAutonomoScreen({ navigation: _navigation }: Props): JSX.Element {
  const { theme } = useTheme();
  const { registerAutonomo } = useAuth();

  const [etapa, setEtapa] = useState<"codigo" | "dados">("codigo");
  const [codigoInterno, setCodigoInterno] = useState("");
  const [companyName, setCompanyName] = useState<string | null>(null);
  const [isBuscando, setIsBuscando] = useState(false);
  const [erroBusca, setErroBusca] = useState<string | null>(null);

  const [papel, setPapel] = useState<PapelAutonomo>("motorista");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [cpf, setCpf] = useState("");
  const [senha, setSenha] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [aceitouTermos, setAceitouTermos] = useState(false);

  async function handleContinuarComCodigo(): Promise<void> {
    setErroBusca(null);
    const codigo = codigoInterno.trim().toUpperCase();
    if (!codigo) {
      // Código vazio: segue pro passo de dados sem vínculo nenhum — mesmo resultado de "Pular".
      setCompanyName(null);
      setEtapa("dados");
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
      setEtapa("dados");
    } catch {
      setErroBusca("Não foi possível verificar esse código agora. Tente novamente.");
    } finally {
      setIsBuscando(false);
    }
  }

  function handlePular(): void {
    setErroBusca(null);
    setCodigoInterno("");
    setCompanyName(null);
    setEtapa("dados");
  }

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
        codigoInterno: codigoInterno.trim() ? codigoInterno.trim().toUpperCase() : undefined,
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

  if (etapa === "codigo") {
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
          Se já tem o código da transportadora, informe aqui pra pedir vínculo assim que sua conta
          for criada. Sem o código agora? Sem problema — dá pra informar depois.
        </Text>

        <AuthTextField
          label="Código da transportadora (opcional)"
          autoCapitalize="characters"
          autoCorrect={false}
          placeholder="Ex.: TRN-000001"
          value={codigoInterno}
          onChangeText={setCodigoInterno}
        />

        {erroBusca ? (
          <Text style={[styles.error, { color: theme.colors.danger }]}>{erroBusca}</Text>
        ) : null}

        <AuthButton
          label="Continuar"
          isLoading={isBuscando}
          onPress={() => void handleContinuarComCodigo()}
        />
        <AuthButton label="Pular por enquanto" variant="secondary" onPress={handlePular} />
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
        {companyName
          ? `Transportadora ${companyName} · complete seus dados pra pedir o vínculo.`
          : 'Crie sua conta e complete a verificação de identidade — o código da transportadora pode ser informado depois, em "Meu pedido".'}
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
      <AuthButton label="Voltar" variant="secondary" onPress={() => setEtapa("codigo")} />
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

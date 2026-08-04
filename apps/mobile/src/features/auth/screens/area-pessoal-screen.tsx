import { StyleSheet, Text } from "react-native";

import { AuthButton, AuthScreen } from "../components";

import type { AuthStackParamList } from "@/navigation/types";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { useTheme } from "@/providers/theme-provider";

type Props = NativeStackScreenProps<AuthStackParamList, "AreaPessoal">;

/**
 * Área Pessoal (Dossiê 15, `AUTH-01`) — Responsável pode criar a conta
 * diretamente (self-service, `POST /auth/register/pessoal`) ou usar um
 * código de convite recebido de uma escola/empresa de transporte já
 * vinculada aos seus filhos; nenhum dos dois caminhos é obrigatório.
 */
export function AreaPessoalScreen({ navigation }: Props): JSX.Element {
  const { theme } = useTheme();

  return (
    <AuthScreen>
      <Text
        style={[
          styles.title,
          { color: theme.colors.text, fontSize: theme.typography.title.fontSize },
        ]}
      >
        Área Pessoal
      </Text>
      <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>
        Crie sua conta de Responsável para cadastrar seus filhos e buscar transportadores. Se você
        já recebeu um código de convite de uma escola ou empresa, também pode usá-lo.
      </Text>

      <AuthButton label="Criar conta" onPress={() => navigation.navigate("CriarContaPessoal")} />
      <AuthButton
        label="Tenho um código de convite"
        variant="secondary"
        onPress={() => navigation.navigate("ConviteCodigo")}
      />
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  subtitle: { fontSize: 14, lineHeight: 20, marginBottom: 8 },
  title: { fontWeight: "600", marginBottom: 4 },
});

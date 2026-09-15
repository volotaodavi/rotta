import { KeyRound, UserPlus } from "@rotta/icons/native";
import { StyleSheet, Text, View } from "react-native";

import { AuthScreen, RoleOptionCard } from "../components";

import type { AuthStackParamList } from "@/navigation/types";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { useTheme } from "@/providers/theme-provider";

type Props = NativeStackScreenProps<AuthStackParamList, "AreaPessoal">;

/**
 * Área Pessoal (Dossiê 15, `AUTH-01`) — Responsável pode criar a conta
 * diretamente (self-service, `POST /auth/register/pessoal`) ou usar um
 * código de convite recebido de uma escola/empresa de transporte já
 * vinculada aos seus filhos; nenhum dos dois caminhos é obrigatório.
 *
 * Redesign 15/09/2026 — ver nota em `criar-conta-screen.tsx`.
 */
export function AreaPessoalScreen({ navigation }: Props): JSX.Element {
  const { theme } = useTheme();

  return (
    <AuthScreen>
      <View style={styles.headingBlock}>
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
      </View>

      <RoleOptionCard
        icon={UserPlus}
        title="Criar conta"
        description="Cadastro rápido, sem precisar de convite."
        onPress={() => navigation.navigate("CriarContaPessoal")}
      />
      <RoleOptionCard
        icon={KeyRound}
        title="Tenho um código de convite"
        description="Recebeu um código de uma escola ou empresa?"
        onPress={() => navigation.navigate("ConviteCodigo")}
      />
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  headingBlock: { gap: 4, marginBottom: 4 },
  subtitle: { fontSize: 14, lineHeight: 20 },
  title: { fontWeight: "700" },
});

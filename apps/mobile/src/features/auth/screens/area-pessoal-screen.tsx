import { StyleSheet, Text } from "react-native";


import { AuthButton, AuthScreen } from "../components";

import type { AuthStackParamList } from "@/navigation/types";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { useTheme } from "@/providers/theme-provider";

type Props = NativeStackScreenProps<AuthStackParamList, "AreaPessoal">;

/**
 * Área Pessoal (Dossiê 15, `AUTH-01`) — contas de Responsável são sempre
 * ativadas por convite da empresa/escola que já cadastrou o aluno; não há
 * autocadastro de Responsável.
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
        Contas de Responsável são ativadas por um convite enviado pela empresa de transporte ou
        escola do seu filho. Se você recebeu um código de convite (ex.: &quot;RTA-8F29KQ&quot;),
        use-o para completar seu cadastro.
      </Text>

      <AuthButton
        label="Tenho um código de convite"
        onPress={() => navigation.navigate("ConviteCodigo")}
      />
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  subtitle: { fontSize: 14, lineHeight: 20, marginBottom: 8 },
  title: { fontWeight: "600", marginBottom: 4 },
});

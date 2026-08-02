import { StyleSheet, Text } from "react-native";


import { AuthButton, AuthScreen } from "../components";

import type { AuthStackParamList } from "@/navigation/types";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { useTheme } from "@/providers/theme-provider";

type Props = NativeStackScreenProps<AuthStackParamList, "CriarConta">;

/**
 * "Como deseja utilizar a Rotta?" (Dossiê 15, `AUTH-01`) — Área
 * Profissional (Empresas/MEIs/Autônomos) ou Área Pessoal (Responsável).
 */
export function CriarContaScreen({ navigation }: Props): JSX.Element {
  const { theme } = useTheme();

  return (
    <AuthScreen>
      <Text
        style={[
          styles.title,
          { color: theme.colors.text, fontSize: theme.typography.title.fontSize },
        ]}
      >
        Como deseja utilizar a Rotta?
      </Text>

      <AuthButton
        label="Área Profissional"
        onPress={() => navigation.navigate("AreaProfissional")}
      />
      <AuthButton
        label="Área Pessoal"
        variant="secondary"
        onPress={() => navigation.navigate("AreaPessoal")}
      />
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  title: { fontWeight: "600", marginBottom: 16 },
});

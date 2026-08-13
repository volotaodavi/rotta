import { StyleSheet, Text } from "react-native";

import { AuthButton, AuthScreen } from "../components";

import type { AuthStackParamList } from "@/navigation/types";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { useTheme } from "@/providers/theme-provider";

type Props = NativeStackScreenProps<AuthStackParamList, "AreaProfissional">;

/**
 * Área Profissional (Dossiê 15, `AUTH-01`) — "Criar Empresa" ou "Já fui
 * convidado por uma empresa". O motorista nunca cria uma empresa; a
 * empresa já existe e ele apenas resgata o convite.
 */
export function AreaProfissionalScreen({ navigation }: Props): JSX.Element {
  const { theme } = useTheme();

  return (
    <AuthScreen>
      <Text
        style={[
          styles.title,
          { color: theme.colors.text, fontSize: theme.typography.title.fontSize },
        ]}
      >
        Área Profissional
      </Text>
      <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>
        Empresas, MEIs e motoristas autônomos.
      </Text>

      <AuthButton
        label="Criar empresa"
        onPress={() => navigation.navigate("CriarEmpresaWebView")}
      />
      <AuthButton
        label="Já fui convidado por uma empresa"
        variant="secondary"
        onPress={() => navigation.navigate("ConviteCodigo")}
      />
      <AuthButton
        label="Sou motorista/monitor autônomo"
        variant="ghost"
        onPress={() => navigation.navigate("CriarContaAutonomo")}
      />
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  subtitle: { fontSize: 14, marginBottom: 8 },
  title: { fontWeight: "600", marginBottom: 4 },
});

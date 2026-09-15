import { Building2, Car, Mail } from "@rotta/icons/native";
import { StyleSheet, Text, View } from "react-native";

import { AuthScreen, RoleOptionCard } from "../components";

import type { AuthStackParamList } from "@/navigation/types";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { useTheme } from "@/providers/theme-provider";

type Props = NativeStackScreenProps<AuthStackParamList, "AreaProfissional">;

/**
 * Área Profissional (Dossiê 15, `AUTH-01`) — "Criar Empresa" ou "Já fui
 * convidado por uma empresa". O motorista nunca cria uma empresa; a
 * empresa já existe e ele apenas resgata o convite.
 *
 * Redesign 15/09/2026 — ver nota em `criar-conta-screen.tsx`.
 */
export function AreaProfissionalScreen({ navigation }: Props): JSX.Element {
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
          Área Profissional
        </Text>
        <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>
          Empresas, MEIs e motoristas autônomos.
        </Text>
      </View>

      <RoleOptionCard
        icon={Building2}
        title="Criar empresa"
        description="Cadastre sua transportadora na Rotta."
        onPress={() => navigation.navigate("CriarEmpresaWebView")}
      />
      <RoleOptionCard
        icon={Mail}
        title="Já fui convidado por uma empresa"
        description="Use o código de convite que você recebeu."
        onPress={() => navigation.navigate("ConviteCodigo")}
      />
      <RoleOptionCard
        icon={Car}
        title="Sou motorista/monitor autônomo"
        description="Atue sem vínculo com uma transportadora."
        onPress={() => navigation.navigate("CriarContaAutonomo")}
      />
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  headingBlock: { gap: 4, marginBottom: 4 },
  subtitle: { fontSize: 14 },
  title: { fontWeight: "700" },
});

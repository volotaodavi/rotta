import { Briefcase, User } from "@rotta/icons/native";
import { StyleSheet, Text, View } from "react-native";

import { AuthScreen, RoleOptionCard } from "../components";

import type { AuthStackParamList } from "@/navigation/types";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { useTheme } from "@/providers/theme-provider";

type Props = NativeStackScreenProps<AuthStackParamList, "CriarConta">;

/**
 * "Como deseja utilizar a Rotta?" (Dossiê 15, `AUTH-01`) — Área
 * Profissional (Empresas/MEIs/Autônomos) ou Área Pessoal (Responsável).
 *
 * Redesign 15/09/2026 — print real da Rotta anexado pelo usuário
 * ("Cadastro — Seleção de Perfil"). Via AskUserQuestion, o usuário
 * decidiu manter as 2 telas atuais (Área Profissional/Área Pessoal)
 * em vez de unificar em 1 tela de 4 cartões — só o visual muda aqui
 * (lista de `AuthButton` → `RoleOptionCard`).
 */
export function CriarContaScreen({ navigation }: Props): JSX.Element {
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
          Como você usa a Rotta?
        </Text>
        <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>
          Escolha o perfil que melhor representa você.
        </Text>
      </View>

      <RoleOptionCard
        icon={Briefcase}
        title="Área Profissional"
        description="Empresas, MEIs e motoristas autônomos."
        onPress={() => navigation.navigate("AreaProfissional")}
      />
      <RoleOptionCard
        icon={User}
        title="Área Pessoal"
        description="Responsável: acompanhe o transporte do seu filho."
        onPress={() => navigation.navigate("AreaPessoal")}
      />
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  headingBlock: { gap: 4, marginBottom: 4 },
  subtitle: { fontSize: 14 },
  title: { fontWeight: "700" },
});

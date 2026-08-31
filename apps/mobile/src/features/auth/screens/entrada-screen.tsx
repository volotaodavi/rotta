import { StyleSheet, Text, View } from "react-native";


import { AuthButton, AuthScreen } from "../components";

import type { AuthStackParamList } from "@/navigation/types";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { RottaLogo } from "@/components/rotta-logo";
import { useTheme } from "@/providers/theme-provider";

type Props = NativeStackScreenProps<AuthStackParamList, "Entrada">;

/**
 * Tela inicial do app (Dossiê 15/24, `AUTH-01`) — símbolo + wordmark
 * Rotta, Entrar, Criar Conta. Ponto de entrada de quem já viu o
 * onboarding (usuário recorrente, Dossiê 24 — Fluxo Inicial): "Criar
 * conta" segue o fluxo já existente (`CriarConta` → Área Profissional/
 * Pessoal); "Escolher meu perfil" é o atalho pra `SelecionarPerfil`
 * (mesma tela nova que o onboarding leva na primeira vez), pra quem
 * prefere aquele fluxo mais visual — nenhum caminho substitui o outro.
 */
export function EntradaScreen({ navigation }: Props): JSX.Element {
  const { theme } = useTheme();

  return (
    <AuthScreen>
      <View style={styles.brand}>
        <RottaLogo size={72} variant="full" />
        <Text style={[styles.tagline, { color: theme.colors.textMuted }]}>
          Conecta. Protege. Tranquiliza.
        </Text>
      </View>

      <View style={styles.actions}>
        <AuthButton label="Entrar" onPress={() => navigation.navigate("Login")} />
        <AuthButton
          label="Criar conta"
          variant="secondary"
          onPress={() => navigation.navigate("CriarConta")}
        />
        <AuthButton
          label="Escolher meu perfil"
          variant="ghost"
          onPress={() => navigation.navigate("SelecionarPerfil")}
        />
      </View>
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  actions: { gap: 12 },
  brand: { alignItems: "center", gap: 8, marginBottom: 48 },
  tagline: { fontSize: 14 },
});

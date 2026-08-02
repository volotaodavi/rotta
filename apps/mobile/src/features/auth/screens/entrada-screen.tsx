import { StyleSheet, Text, View } from "react-native";


import { AuthButton, AuthScreen } from "../components";

import type { AuthStackParamList } from "@/navigation/types";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { useTheme } from "@/providers/theme-provider";

type Props = NativeStackScreenProps<AuthStackParamList, "Entrada">;

/**
 * Tela inicial do app (Dossiê 15, `AUTH-01`) — "Logo Rotta, Entrar, Criar
 * Conta". Ponto de entrada único: nenhuma escolha de papel acontece aqui,
 * apenas Entrar (conta existente) ou Criar Conta (nova conta).
 */
export function EntradaScreen({ navigation }: Props): JSX.Element {
  const { theme } = useTheme();

  return (
    <AuthScreen>
      <View style={styles.brand}>
        <Text
          style={[
            styles.logo,
            { color: theme.colors.text, fontSize: theme.typography.displayMobile.fontSize },
          ]}
        >
          Rotta
        </Text>
        <Text style={[styles.tagline, { color: theme.colors.textMuted }]}>
          Transporte escolar sob controle.
        </Text>
      </View>

      <View style={styles.actions}>
        <AuthButton label="Entrar" onPress={() => navigation.navigate("Login")} />
        <AuthButton
          label="Criar conta"
          variant="secondary"
          onPress={() => navigation.navigate("CriarConta")}
        />
      </View>
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  actions: { gap: 12 },
  brand: { alignItems: "center", gap: 8, marginBottom: 48 },
  logo: { fontWeight: "700" },
  tagline: { fontSize: 14 },
});

import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StyleSheet, Text, View } from "react-native";

import type { AuthStackParamList } from "./types";

const Stack = createNativeStackNavigator<AuthStackParamList>();

/**
 * PLACEHOLDER — nao e a tela de login real.
 *
 * O fluxo completo (OTP por telefone, e-mail/senha, magic link, OAuth —
 * Dossie 15 `AUTH-02`) sera implementado a partir de `@rotta/ui/native`
 * e `@rotta/auth` quando esta fase de fundacao for concluida.
 */
function LoginPlaceholder(): JSX.Element {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Rotta</Text>
      <Text style={styles.subtitle}>Tela de login em construção.</Text>
    </View>
  );
}

/**
 * Navigator de autenticacao (Dossie 15) — telas de login/cadastro,
 * exibido pelo `RootNavigator` quando nao ha sessao ativa.
 */
export function AuthNavigator(): JSX.Element {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginPlaceholder} />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: "center", flex: 1, gap: 8, justifyContent: "center" },
  subtitle: { fontSize: 14, opacity: 0.6 },
  title: { fontSize: 32, fontWeight: "700" },
});

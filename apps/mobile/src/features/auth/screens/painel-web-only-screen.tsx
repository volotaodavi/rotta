import { useAuth } from "@rotta/auth/native";
import { StyleSheet, Text, View } from "react-native";

import { AuthButton } from "../components";

import { useTheme } from "@/providers/theme-provider";


/**
 * Papéis de gestão (Empresa/Gestor/Escola/Admin Rotta) ainda não têm
 * telas próprias no app mobile — este app é dedicado a Motorista/Monitor/
 * Responsável (ver `README.md`); a gestão acontece no Painel Web. Exibida
 * pelo `RootNavigator` quando a sessão real (mesma conta, Dossiê 15) tem
 * um desses papéis.
 */
export function PainelWebOnlyScreen(): JSX.Element {
  const { theme } = useTheme();
  const { user, logout } = useAuth();

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.colors.background, padding: theme.spacing[6] },
      ]}
    >
      <Text
        style={[
          styles.title,
          { color: theme.colors.text, fontSize: theme.typography.title.fontSize },
        ]}
      >
        Use o Painel Web
      </Text>
      <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>
        Olá, {user?.nome ?? ""}. A gestão da sua empresa ainda não está disponível no aplicativo —
        acesse o Painel Web pelo navegador com a mesma conta.
      </Text>
      <AuthButton label="Sair" variant="secondary" onPress={() => void logout()} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: "center", flex: 1, gap: 16, justifyContent: "center" },
  subtitle: { fontSize: 14, lineHeight: 20, textAlign: "center" },
  title: { fontWeight: "600" },
});

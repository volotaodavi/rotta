import { NavigationContainer } from "@react-navigation/native";
import { useAuth } from "@rotta/auth/native";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { AuthNavigator } from "./AuthNavigator";
import { DriverNavigator } from "./DriverNavigator";
import { ParentNavigator } from "./ParentNavigator";

import { usePinLock } from "@/features/auth/hooks/use-pin-lock";
import { PainelWebOnlyScreen, PinLockScreen } from "@/features/auth/screens";
import { useTheme } from "@/providers/theme-provider";


/**
 * Navigator raiz — decide entre `AuthNavigator` e o navigator do papel
 * ativo do usuario autenticado (Motorista/Monitor -> `DriverNavigator`,
 * Responsavel -> `ParentNavigator`), conforme Dossie 10 Secao 11.1 e
 * Dossie 23 Secao 4.2: a arvore de navegacao e estruturalmente diferente
 * por papel, nao apenas uma tela escondida por permissao.
 *
 * A sessao real (`@rotta/auth`, Dossie 15) decide isso em tempo de
 * execucao — mesma conta compartilhada com `apps/web`/`apps/admin`, nunca
 * uma variante de build ou app separado (briefing: "nunca aplicativos
 * separados por papel"). Papeis de gestao (Empresa/Gestor/Escola/Admin
 * Rotta) ainda nao tem telas proprias no app — ver `PainelWebOnlyScreen`.
 *
 * PIN de acesso rápido (Dossiê 42, opt-in do Motorista no Perfil) — se
 * ativado, `usePinLock` decide se a tela de PIN aparece por cima de
 * tudo isto antes de mostrar o navigator do papel ativo. Fora do
 * `NavigationContainer` de propósito: a tela de PIN não navega para
 * nada, é só um portão sobre uma sessão que já existe.
 */
export function RootNavigator(): JSX.Element {
  const { status, user } = useAuth();
  const { theme } = useTheme();
  const { isLocked, unlock } = usePinLock({ userId: user?.id ?? null, status });

  if (status === "loading") {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  if (status === "authenticated" && user && isLocked) {
    return <PinLockScreen onUnlock={unlock} />;
  }

  return (
    <NavigationContainer>
      {status === "unauthenticated" || !user ? (
        <AuthNavigator />
      ) : user.role === "motorista" || user.role === "monitor" ? (
        <DriverNavigator />
      ) : user.role === "responsavel" ? (
        <ParentNavigator />
      ) : (
        <PainelWebOnlyScreen />
      )}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center", flex: 1, justifyContent: "center" },
});

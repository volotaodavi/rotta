import { NavigationContainer } from "@react-navigation/native";
import { useAuth } from "@rotta/auth/native";
import { useEffect, useState } from "react";

import { AuthNavigator } from "./AuthNavigator";
import { DriverNavigator } from "./DriverNavigator";
import { ParentNavigator } from "./ParentNavigator";
import { VinculoPendenteNavigator } from "./VinculoPendenteNavigator";

import { AppSplashScreen } from "@/components/app-splash-screen";
import { usePinLock } from "@/features/auth/hooks/use-pin-lock";
import { PainelWebOnlyScreen, PinLockScreen } from "@/features/auth/screens";
import { useMyIdentityVerification } from "@/features/driver/hooks/use-identity-verification";
import { IdentityVerificationBlockedScreen } from "@/features/driver/screens/identity-verification-blocked-screen";
import { usePushRegistration } from "@/features/notifications/hooks/use-push-registration";
import { VehicleAdminReviewAcknowledgeSheet } from "@/features/vehicles/components/vehicle-admin-review-acknowledge-sheet";
import { getHasSeenOnboarding } from "@/lib/onboarding-store";


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
  const { isLocked, unlock } = usePinLock({ userId: user?.id ?? null, status });
  // Push real (Frente 0) — registra o token do Expo Push Service assim que
  // a sessão fica autenticada; nunca bloqueia nem altera esta árvore de
  // navegação (só efeito colateral, sem UI própria).
  usePushRegistration({ status });

  // Flag "onboarding já visto" (Dossiê 24 — primeira experiência):
  // resolvido em paralelo à sessão, nunca depois — sem isso a splash
  // trocaria de tela duas vezes (primeiro a sessão resolve, DEPOIS o
  // flag), um "pulo" visível que a Seção 1 pede pra evitar ("não
  // bloquear o usuário desnecessariamente" também vale pra não mostrar
  // dois estados de carregamento em sequência).
  const [hasSeenOnboarding, setHasSeenOnboardingState] = useState<boolean | null>(null);
  useEffect(() => {
    let mounted = true;
    getHasSeenOnboarding()
      .then((seen) => {
        if (mounted) setHasSeenOnboardingState(seen);
      })
      .catch(() => {
        if (mounted) setHasSeenOnboardingState(true);
      });
    return () => {
      mounted = false;
    };
  }, []);

  // Verificação de identidade (Frente J) só se aplica a Motorista/Monitor
  // — o único papel de gestão com telas reais neste app; Empresa/Gestor
  // já caem em `PainelWebOnlyScreen` antes de chegar aqui, e Responsável
  // não usa este fluxo (backend nem aceita `SELF_VERIFICATION_ROLES`
  // pra ele). A query nem dispara fora desse papel.
  const isMotoristaOuMonitor =
    status === "authenticated" && (user?.role === "motorista" || user?.role === "monitor");
  const { data: identityVerification, isLoading: isIdentityLoading } = useMyIdentityVerification({
    enabled: isMotoristaOuMonitor,
  });

  if (
    status === "loading" ||
    hasSeenOnboarding === null ||
    (isMotoristaOuMonitor && isIdentityLoading)
  ) {
    return <AppSplashScreen />;
  }

  if (status === "authenticated" && user && isLocked) {
    return <PinLockScreen onUnlock={unlock} />;
  }

  // Ampliado de `=== "REPROVADA"` (mesma mudança de `apps/web`, pedido
  // do usuário: "travar quase tudo" até a identidade estar de fato
  // aprovada) — antes só quem tinha sido RECUSADO ficava bloqueado.
  if (
    isMotoristaOuMonitor &&
    identityVerification != null &&
    identityVerification.status !== "APROVADA"
  ) {
    return <IdentityVerificationBlockedScreen />;
  }

  return (
    <NavigationContainer>
      {status === "unauthenticated" || !user ? (
        <AuthNavigator initialRouteName={hasSeenOnboarding ? "Entrada" : "Onboarding"} />
      ) : user.role === "motorista" || user.role === "monitor" ? (
        // Frente N — cadastro autônomo (`registerAutonomo`) ainda não tem
        // `companyId` até um `CompanyJoinRequest` ser aprovado.
        user.companyId ? (
          <DriverNavigator />
        ) : (
          <VinculoPendenteNavigator />
        )
      ) : user.role === "responsavel" ? (
        <>
          <ParentNavigator />
          <VehicleAdminReviewAcknowledgeSheet />
        </>
      ) : (
        <PainelWebOnlyScreen />
      )}
    </NavigationContainer>
  );
}

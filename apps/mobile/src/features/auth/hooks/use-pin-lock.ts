import { useEffect, useRef, useState } from "react";
import { AppState, type AppStateStatus } from "react-native";

import { isPinLockEnabled } from "../pin-lock-store";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

/**
 * Trava do PIN de acesso rápido (Dossiê 42) — decide só se a UI de uma
 * sessão que JÁ existe fica visível ou escondida atrás da tela de PIN.
 * Nunca é a fonte de verdade da sessão (`@rotta/auth` continua sendo) —
 * por isso vive local ao app mobile, não em `packages/auth` (que é
 * compartilhado com Web/Admin, onde este recurso não existe).
 *
 * Quando trava:
 * - Sessão restaurada do zero no boot do app (`status` sai de "loading"
 *   direto para "authenticated" — refresh token salvo de uma vez
 *   anterior), se o usuário tiver PIN ativado.
 * - App volta de background/inactive para active, a qualquer momento.
 *
 * Quando NÃO trava (de propósito): logo após um login explícito nesta
 * mesma execução do app (`status` sai de "unauthenticated" — pessoa
 * estava na tela de Entrar — para "authenticated") — pedir o PIN de novo
 * na sequência de já ter digitado a senha inteira seria redundante.
 */
export function usePinLock(params: { userId: string | null; status: AuthStatus }): {
  isLocked: boolean;
  unlock: () => void;
} {
  const { userId, status } = params;
  const [isLocked, setIsLocked] = useState(false);
  const previousStatus = useRef<AuthStatus>(status);
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    const cameFromColdStart = previousStatus.current === "loading";
    const justBecameAuthenticated =
      status === "authenticated" && previousStatus.current !== "authenticated";
    previousStatus.current = status;

    if (status !== "authenticated") {
      setIsLocked(false);
      return;
    }
    if (!justBecameAuthenticated || !cameFromColdStart || !userId) {
      return;
    }
    let cancelled = false;
    void isPinLockEnabled(userId).then((enabled) => {
      if (!cancelled && enabled) {
        setIsLocked(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [status, userId]);

  useEffect(() => {
    if (!userId || status !== "authenticated") {
      return;
    }
    const subscription = AppState.addEventListener("change", (next: AppStateStatus) => {
      const previous = appState.current;
      appState.current = next;
      if ((previous === "background" || previous === "inactive") && next === "active") {
        void isPinLockEnabled(userId).then((enabled) => {
          if (enabled) {
            setIsLocked(true);
          }
        });
      }
    });
    return () => subscription.remove();
  }, [userId, status]);

  return { isLocked, unlock: () => setIsLocked(false) };
}

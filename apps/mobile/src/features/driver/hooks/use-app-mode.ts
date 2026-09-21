import { useCallback, useEffect, useState } from "react";

import type { MeResponse } from "@rotta/api-client";

import { gravarNoCofre, lerDoCofre } from "@/lib/cofre-seguro";

export type AppMode = "completo" | "acao";

const DEFAULT_MODE: AppMode = "completo";

function storageKey(userId: string): string {
  return `rotta_app_mode:${userId}`;
}

/**
 * Quem pode alternar entre "Visão completa" (gestão, `EmpresaNavigator`)
 * e "Modo Ação" (operação, `DriverNavigator` reaproveitado) — mesma
 * regra de `apps/web/src/features/driver/hooks/use-app-mode.ts`: só o
 * dono que também dirige (`role === "empresa"` com `companyType`
 * AUTONOMO/MEI). Motorista/Monitor FUNCIONÁRIO de uma empresa maior é
 * outro `role` inteiramente (motorista/monitor) e nunca vê este
 * alternador — já usa o app operacional diretamente.
 */
export function podeAlternarModoAcao(user: MeResponse | null): boolean {
  return (
    user?.role === "empresa" && (user.companyType === "AUTONOMO" || user.companyType === "MEI")
  );
}

export interface AppModeState {
  mode: AppMode;
  canToggle: boolean;
  setMode: (mode: AppMode) => void;
  /** `false` enquanto a preferência salva ainda está sendo lida do `SecureStore` — evita trocar de navigator por um instante (mesmo cuidado do `isModeResolved` da Web, ver HISTÓRICO lá). */
  isModeResolved: boolean;
}

/**
 * Mirror mobile de `apps/web/src/features/driver/hooks/use-app-mode.ts`
 * (Frente 6 do plano "lacunas app mobile por papel" — pedido do
 * usuário 11/09/2026: "Motorista (autônomo/MEI) - Tudo oq o motorista
 * anterior tem + financeiro + alunos + perfil + escolas + veículos").
 *
 * Sem o palpite inicial por `isStandalone` da Web (não existe "app
 * instalado como PWA" no app nativo — aqui SEMPRE é o app instalado):
 * todo mundo começa em "Visão completa" na primeira vez; a partir do
 * primeiro toque no alternador, a escolha do usuário sempre vence,
 * persistida por usuário no `expo-secure-store` (mesmo mecanismo já
 * usado por `lib/onboarding-store.ts` — nunca no backend, é só uma
 * preferência de exibição, não uma permissão).
 *
 * Uma ÚNICA instância deste hook deve existir por sessão (chamada em
 * `RootNavigator`, compartilhada via `AppModeProvider`/
 * `useAppModeContext`) — os Perfis de Empresa e de Motorista/Monitor
 * (onde mora o botão de alternar) ficam em pontos diferentes da árvore
 * de navegação; cada um chamando este hook por conta própria criaria
 * dois estados independentes, e alternar num não atualizaria o outro.
 */
export function useAppMode(user: MeResponse | null): AppModeState {
  const canToggle = podeAlternarModoAcao(user);
  const userId = user?.id;
  const [mode, setModeState] = useState<AppMode>(DEFAULT_MODE);
  const [isModeResolved, setIsModeResolved] = useState(false);

  /**
   * INCIDENTE 21/09/2026 — "a conta do transportador não está entrando
   * (nenhuma), fica na tela azul escrito ROTTA".
   *
   * `RootNavigator` mostra a splash enquanto `canToggle &&
   * !isModeResolved`. Este efeito era a ÚNICA coisa capaz de virar
   * `isModeResolved` para `true`, e a leitura do cofre estava sem
   * proteção nenhuma: bastava `getItemAsync` lançar (ver
   * `lib/cofre-seguro.ts` — acontece de verdade no Android) para
   * `carregar()` rejeitar, o `void` engolir a rejeição em silêncio e o
   * app ficar na splash PARA SEMPRE.
   *
   * Quem `canToggle` pega? Exatamente `role === "empresa"` com
   * `companyType` AUTONOMO/MEI — o transportador. O Responsável nunca
   * entrava nesta condição, e por isso a conta dele continuava abrindo
   * normalmente enquanto "nenhuma" do transportador abria.
   *
   * Duas mudanças, e as duas importam:
   *
   *  1. A leitura passou a ser `lerDoCofre`, que devolve `null` em vez
   *     de lançar.
   *  2. `setIsModeResolved(true)` mora num `finally`. Mesmo que algo
   *     aqui dentro lance por um motivo que eu não previ, o app SAI da
   *     splash. Uma preferência de exibição não resolvida vale, no pior
   *     caso, abrir na "Visão completa" — nunca não abrir.
   */
  useEffect(() => {
    let cancelado = false;
    setIsModeResolved(false);

    async function carregar(): Promise<void> {
      try {
        if (!canToggle || !userId) {
          if (!cancelado) setModeState(DEFAULT_MODE);
          return;
        }
        const salvo = await lerDoCofre(storageKey(userId));
        if (cancelado) return;
        setModeState(salvo === "acao" || salvo === "completo" ? salvo : DEFAULT_MODE);
      } catch (error) {
        // `lerDoCofre` já promete não lançar. Este `catch` é para o que
        // eu NÃO previ: sem ele a promessa rejeitaria, o `void` abaixo
        // engoliria a rejeição em silêncio, e ficaria só um aviso solto
        // no console — que foi exatamente como o travamento original
        // passou despercebido.
        if (!cancelado) setModeState(DEFAULT_MODE);
        // eslint-disable-next-line no-console
        console.warn("[app-mode] Não consegui ler a preferência de modo.", error);
      } finally {
        if (!cancelado) setIsModeResolved(true);
      }
    }

    void carregar();
    return () => {
      cancelado = true;
    };
  }, [canToggle, userId]);

  const setMode = useCallback(
    (next: AppMode) => {
      setModeState(next);
      // `gravarNoCofre` não lança — no pior caso a escolha não
      // sobrevive ao fechamento do app, o que é um incômodo, não um
      // travamento.
      if (userId) void gravarNoCofre(storageKey(userId), next);
    },
    [userId],
  );

  return { mode: canToggle ? mode : DEFAULT_MODE, canToggle, setMode, isModeResolved };
}

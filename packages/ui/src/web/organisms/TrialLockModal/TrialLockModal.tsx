"use client";

import { Lock } from "@rotta/icons";
import { useEffect, useState } from "react";

import { buttonVariants } from "../../atoms/Button/Button";
import { Modal } from "../Modal/Modal";

/**
 * Faturamento (Dossiê 26) — pop-up mostrado sempre que uma ação é
 * bloqueada (trial vencido, inadimplente, suspenso ou cancelado — ver
 * `TrialGuard`/`code: "TRIALEXPIRADO"` no backend). Mesmo padrão exato
 * de `pushToastFromOutsideReact` (`Toast.tsx`): uma ponte de fora da
 * árvore React, porque o gatilho mais comum (`MutationCache.onError`
 * em `query-provider.tsx`) roda fora de qualquer componente. Também é
 * aberto diretamente pelo clique num item de navegação bloqueado
 * (cadeado ao lado do label) — nesse caso sem nenhum round-trip à API.
 *
 * Só existe UM `<TrialLockModal/>` real por app (montado uma vez em
 * `AppProviders`, junto do `ToastProvider`) — "o último montado" é
 * sempre o correto, mesmo raciocínio do Toast.
 */
let activeBridge: ((message: string) => void) | null = null;

export function openTrialLockModalFromOutsideReact(message: string): void {
  activeBridge?.(message);
}

const DEFAULT_MESSAGE =
  "Seu período de teste grátis acabou. Assine o plano Starter (R$ 39,90/mês) para continuar usando a Rotta.";

export interface TrialLockModalProps {
  /** Rota do checkout próprio da Rotta (Frente D) — padrão `/assinatura`. */
  subscribeHref?: string;
}

export function TrialLockModal({
  subscribeHref = "/assinatura",
}: TrialLockModalProps): JSX.Element {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    activeBridge = setMessage;
    return () => {
      activeBridge = null;
    };
  }, []);

  return (
    <Modal
      isOpen={message !== null}
      onClose={() => setMessage(null)}
      ariaLabel="Assinatura necessária"
    >
      <Modal.Header onClose={() => setMessage(null)}>
        <span className="flex items-center gap-2">
          <Lock className="h-4 w-4 text-danger" />
          Assinatura necessária
        </span>
      </Modal.Header>
      <Modal.Body>
        <p className="text-sm text-text">{message || DEFAULT_MESSAGE}</p>
      </Modal.Body>
      <Modal.Footer>
        <button
          type="button"
          onClick={() => setMessage(null)}
          className={buttonVariants({ variant: "ghost" })}
        >
          Fechar
        </button>
        <a href={subscribeHref} className={buttonVariants({ variant: "primary" })}>
          Assinar agora
        </a>
      </Modal.Footer>
    </Modal>
  );
}

"use client";

import { Button } from "@rotta/ui/web";
import Image from "next/image";
import { useEffect, useState } from "react";

import { isStandalone } from "@/lib/pwa";

/** `beforeinstallprompt` (Chrome/Edge/Android) não está no lib.dom.d.ts padrão do TS — tipagem mínima do que este componente de fato usa. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/** `localStorage` — quando o usuário recusa/fecha o convite, não pergunta de novo por esse tempo (evita "nagging" a cada visita). */
const SNOOZE_KEY = "rotta-install-prompt-snoozed-until";
const SNOOZE_DAYS = 14;

function isSnoozed(): boolean {
  const until = localStorage.getItem(SNOOZE_KEY);
  return until !== null && Date.now() < Number(until);
}

function snooze(): void {
  localStorage.setItem(SNOOZE_KEY, String(Date.now() + SNOOZE_DAYS * 24 * 60 * 60 * 1000));
}

/**
 * Convite "Instalar o app da Rotta" (pop-up inferior, Android/Chrome) —
 * captura o evento nativo `beforeinstallprompt` (o Chrome dispara isso
 * sozinho quando o `manifest.ts`/`sw.js` já atendem aos critérios de
 * instalabilidade — nada aqui força a exibição) e guarda pra disparar
 * sob demanda: o Chrome só permite chamar `prompt()` dentro de um gesto
 * do próprio usuário (aqui, o clique no botão "Instalar"), nunca
 * automaticamente. Aceitar o convite do Chrome instala a Rotta como um
 * app de verdade (ícone na tela inicial, própria entrada no launcher,
 * sem barra de endereço) — sem passar pela Play Store, mesmo mecanismo
 * usado por Twitter/Uber/Starbucks no Android.
 *
 * iOS/Safari nunca dispara `beforeinstallprompt` (Apple não implementa
 * esse evento) — o banner simplesmente nunca aparece lá; instalar no
 * iOS continua sendo "Compartilhar → Adicionar à Tela de Início", fora
 * do escopo deste componente.
 */
export function InstallAppPrompt(): JSX.Element | null {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isStandalone() || isSnoozed()) return;

    function handleBeforeInstallPrompt(event: Event): void {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setVisible(true);
    }

    function handleAppInstalled(): void {
      setVisible(false);
      setDeferredPrompt(null);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  if (!visible || !deferredPrompt) return null;

  async function handleInstall(): Promise<void> {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    // O resultado (`accepted`/`dismissed`) só decide se soneca — o
    // evento `beforeinstallprompt` em si só dispara de novo numa visita
    // futura de qualquer forma (o Chrome não reemite na mesma sessão).
    await deferredPrompt.userChoice;
    snooze();
    setVisible(false);
    setDeferredPrompt(null);
  }

  function handleDismiss(): void {
    snooze();
    setVisible(false);
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 flex justify-center p-4 sm:p-6">
      <div className="flex w-full max-w-md items-center gap-3 rounded-xl border border-border bg-surface-elevated p-4 shadow-lg">
        <Image
          src="/brand/rotta-mark-192.png"
          alt=""
          width={40}
          height={40}
          className="h-10 w-10 shrink-0 rounded-lg"
        />
        <div className="flex-1">
          <p className="text-sm font-semibold text-text">Instale o app da Rotta</p>
          <p className="text-xs text-text-muted">
            Acesso mais rápido, direto da tela inicial do seu celular.
          </p>
        </div>
        <Button variant="primary" onClick={() => void handleInstall()}>
          Instalar
        </Button>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Fechar"
          className="shrink-0 rounded-md p-1 text-text-muted hover:text-text"
        >
          ×
        </button>
      </div>
    </div>
  );
}

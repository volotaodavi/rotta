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

/**
 * `sessionStorage` (não `localStorage`) — de propósito: pedido explícito
 * do usuário é "isso deve se repetir até ele instalar o app". Fechar
 * com o "×" só cala o convite pelo RESTO desta sessão (não fica
 * reabrindo a cada troca de página dentro da mesma visita); numa
 * próxima visita (nova aba/sessão), se ainda não instalou
 * (`isStandalone()` continua `false`), o convite volta a aparecer —
 * sem prazo de validade, sem parar sozinho.
 */
const DISMISSED_KEY = "rotta-install-prompt-dismissed-session";

function isDismissedThisSession(): boolean {
  return sessionStorage.getItem(DISMISSED_KEY) === "1";
}

function dismissForSession(): void {
  sessionStorage.setItem(DISMISSED_KEY, "1");
}

/**
 * Convite "Instalar o app da Rotta" (pop-up inferior, Chrome/Edge) —
 * captura o evento nativo `beforeinstallprompt` (o navegador dispara
 * isso sozinho quando o `manifest.ts`/`sw.js` já atendem aos critérios
 * de instalabilidade — nada aqui força a exibição) e guarda pra
 * disparar sob demanda: o navegador só permite chamar `prompt()` dentro
 * de um gesto do próprio usuário (aqui, o clique no botão "Instalar"),
 * nunca automaticamente. Aceitar o convite instala a Rotta como um app
 * de verdade — sem passar por loja nenhuma, mesmo mecanismo usado por
 * Twitter/Uber/Starbucks.
 *
 * `beforeinstallprompt` dispara IGUAL no Android E no desktop (Chrome/
 * Edge) — pedido do usuário em produção ("Isso deve ser tanto para o
 * Android, quanto para desktop... app baixado direto pelo Google
 * Chrome"): por isso o texto abaixo nunca cita "celular"/"tela
 * inicial" — no desktop isso instalaria a Rotta como app do sistema
 * (janela própria, ícone no menu Iniciar/Dock), não "na tela do
 * celular", e o texto estaria simplesmente errado pra quem está vendo
 * o convite no computador.
 *
 * iOS/Safari nunca dispara `beforeinstallprompt` (Apple não implementa
 * esse evento) — o banner simplesmente nunca aparece lá; instalar no
 * iOS continua sendo "Compartilhar → Adicionar à Tela de Início", fora
 * do escopo deste componente.
 *
 * Renderizado no layout raiz (`app/layout.tsx`) — aparece em TODO o
 * site, Landing Page incluída (nenhuma rota o desliga), pra qualquer
 * visitante que ainda não tenha o app instalado.
 */
export function InstallAppPrompt(): JSX.Element | null {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isStandalone() || isDismissedThisSession()) return;

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
    // Se aceitar, o evento `appinstalled` (acima) já esconde o convite
    // pra sempre (`isStandalone()` passa a `true`). Se recusar no diálogo
    // nativo do Chrome, cala só pelo resto desta sessão — volta a
    // aparecer na próxima visita, mesmo comportamento do "×".
    await deferredPrompt.userChoice;
    dismissForSession();
    setVisible(false);
    setDeferredPrompt(null);
  }

  function handleDismiss(): void {
    dismissForSession();
    setVisible(false);
  }

  return (
    // `bottom` calculado (não `bottom-0`) — este componente é global
    // (renderizado uma vez no layout raiz, sem saber se a rota atual
    // tem `DriverBottomNav` fixa por baixo, Frente O). Sem esse
    // respiro o convite ficaria empilhado por cima da barra de 4
    // ícones de Motorista/Monitor/autônomo/MEI; nas demais rotas só
    // sobe um pouco a mais em vez de ficar colado na borda.
    <div
      className="fixed inset-x-0 z-50 flex justify-center p-4 sm:p-6"
      style={{ bottom: "calc(4rem + env(safe-area-inset-bottom))" }}
    >
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
            Para uma performance melhor, instale o app no seu dispositivo — celular ou computador.
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

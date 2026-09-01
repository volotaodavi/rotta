"use client";

import Script from "next/script";
import { useEffect, useId, useRef, useState } from "react";

import { env } from "@/config/env";

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: string | HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: () => void;
        },
      ) => string;
      remove: (widgetId: string) => void;
    };
  }
}

interface TurnstileWidgetProps {
  /** `null` sempre que o token ainda não existe/expirou/deu erro — nunca reaproveitar um token velho. */
  onToken: (token: string | null) => void;
}

/**
 * Cloudflare Turnstile ("não sou um robô", pedido do usuário
 * 01/09/2026) — usado nos cadastros self-service da web (`criar-conta/
 * pessoal`, `criar-conta/empresa`; ver `AuthService.assertHumanIfWeb`,
 * que só EXIGE o token quando o pedido vem da web). Sem
 * `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, não renderiza nada (stub honesto,
 * mesmo padrão de `usePushRegistration`) — o cadastro segue
 * funcionando normalmente, sem pedir verificação, até a chave existir
 * em produção.
 *
 * Renderização explícita (`window.turnstile.render`, não a `<div
 * class="cf-turnstile">` automática da Cloudflare) para ter o token
 * direto no callback, sem precisar ler o DOM.
 */
export function TurnstileWidget({ onToken }: TurnstileWidgetProps): JSX.Element | null {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const onTokenRef = useRef(onToken);
  onTokenRef.current = onToken;
  const [scriptReady, setScriptReady] = useState(false);
  const domId = `turnstile-${useId()}`;

  useEffect(() => {
    const siteKey = env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
    if (!scriptReady || !siteKey || !containerRef.current || !window.turnstile) return;

    const turnstile = window.turnstile;
    widgetIdRef.current = turnstile.render(containerRef.current, {
      sitekey: siteKey,
      callback: (token) => onTokenRef.current(token),
      "expired-callback": () => onTokenRef.current(null),
      "error-callback": () => onTokenRef.current(null),
    });

    return () => {
      if (widgetIdRef.current) turnstile.remove(widgetIdRef.current);
    };
  }, [scriptReady]);

  if (!env.NEXT_PUBLIC_TURNSTILE_SITE_KEY) return null;

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        onReady={() => setScriptReady(true)}
      />
      <div ref={containerRef} id={domId} />
    </>
  );
}

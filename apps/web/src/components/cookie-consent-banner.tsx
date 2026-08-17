"use client";

import { Button } from "@rotta/ui/web";
import Link from "next/link";
import { useEffect, useState } from "react";

import { getCookieConsent, setCookieConsent } from "@/lib/cookie-consent";

/**
 * Banner de consentimento de cookies (LGPD, art. 7º/8º) — só aparece
 * se `hasGoogleAnalytics` for `true` (ou seja, existe um Measurement ID
 * real configurado, ver `lib/site-config.ts#getGoogleAnalyticsId`).
 * Sem Analytics configurado, não há cookie de terceiro nenhum rodando
 * no site — mostrar um banner de consentimento pra nada seria só
 * ruído, nunca "mais seguro por via das dúvidas".
 *
 * Fica escondido em duas situações: antes de montar no cliente (evita
 * "flash" do banner em cada navegação server-rendered antes do
 * JavaScript checar o `localStorage`) e depois que a pessoa já decidiu
 * (aceitar OU recusar — `getCookieConsent()` não é mais `null`).
 * "Recusar" é um botão de primeira classe, do mesmo tamanho/destaque
 * que "Aceitar" — LGPD exige que negar seja tão fácil quanto aceitar,
 * nunca escondido atrás de um "Configurações" à parte.
 */
export function CookieConsentBanner({
  hasGoogleAnalytics,
}: {
  hasGoogleAnalytics: boolean;
}): JSX.Element | null {
  const [mounted, setMounted] = useState(false);
  const [decided, setDecided] = useState(false);

  useEffect(() => {
    setMounted(true);
    setDecided(getCookieConsent() !== null);
  }, []);

  if (!hasGoogleAnalytics || !mounted || decided) return null;

  function decide(status: "accepted" | "rejected"): void {
    setCookieConsent(status);
    setDecided(true);
  }

  return (
    <div
      role="region"
      aria-label="Consentimento de cookies"
      className="fixed inset-x-0 bottom-0 z-toast border-t border-border bg-surface-elevated p-4 shadow-lg"
    >
      <div className="mx-auto flex max-w-4xl flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-text-muted">
          Usamos cookies do Google Analytics para entender como o site é usado e melhorar a
          experiência. Você pode aceitar ou recusar — veja detalhes na{" "}
          <Link href="/legal/cookies" className="text-primary hover:underline">
            Política de Cookies
          </Link>
          .
        </p>
        <div className="flex shrink-0 gap-2">
          <Button variant="secondary" size="sm" onClick={() => decide("rejected")}>
            Recusar
          </Button>
          <Button variant="primary" size="sm" onClick={() => decide("accepted")}>
            Aceitar
          </Button>
        </div>
      </div>
    </div>
  );
}

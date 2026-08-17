"use client";

import Script from "next/script";
import { useEffect, useState } from "react";

import { getCookieConsent, subscribeCookieConsent } from "@/lib/cookie-consent";

declare global {
  interface Window {
    dataLayer?: unknown[];
  }
}

/**
 * Google Analytics 4 (gtag.js) — só injeta os dois `<script>` quando
 * AS DUAS condições são verdadeiras: existe um `measurementId` real
 * (env var `NEXT_PUBLIC_GA_MEASUREMENT_ID`, ver
 * `lib/site-config.ts#getGoogleAnalyticsId`) E a pessoa já aceitou o
 * banner de cookies (`CookieConsentBanner`). Enquanto qualquer uma
 * faltar, este componente renderiza `null` — nenhum cookie de terceiro
 * é criado, nenhuma chamada sai pro Google. Reage em tempo real à
 * mudança de consentimento (`subscribeCookieConsent`) sem precisar de
 * reload: aceitar no banner já liga o rastreamento na mesma visita.
 */
export function GoogleAnalytics({ measurementId }: { measurementId?: string }): JSX.Element | null {
  const [consentGiven, setConsentGiven] = useState(false);

  useEffect(() => {
    const sync = (): void => setConsentGiven(getCookieConsent() === "accepted");
    sync();
    return subscribeCookieConsent(sync);
  }, []);

  if (!measurementId || !consentGiven) return null;

  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`} async />
      <Script id="google-analytics-init">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${measurementId}');
        `}
      </Script>
    </>
  );
}

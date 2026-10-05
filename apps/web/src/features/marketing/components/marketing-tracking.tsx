"use client";

import { usePathname } from "next/navigation";
import Script from "next/script";
import { useEffect, useRef } from "react";

import {
  gaMeasurementId,
  googleAdsId,
  metaPixelId,
  rastrear,
  rastreamentoLigado,
} from "../tracking";

/**
 * Carrega o Pixel do Meta e o gtag do Google, e manda `PageView` a cada
 * troca de página. Montado só nas áreas públicas (o site e as telas de
 * criar conta/entrar), nunca dentro do painel autenticado: ver a nota
 * de privacidade em `../tracking.ts`.
 *
 * Sem variável de ambiente configurada, este componente não renderiza
 * script nenhum e não faz nada. É o estado do site hoje, e é o que
 * permite o código entrar antes de o fundador ter a conta de anúncio
 * pronta: no dia em que ele colar o ID na Vercel, começa a medir
 * sozinho, sem precisar de deploy de código novo.
 *
 * `strategy="afterInteractive"`: o script de anúncio nunca disputa com
 * o conteúdo da página. Quem chegou pelo anúncio vê o site primeiro, e
 * a medição acontece logo depois.
 */
export function MarketingTracking(): JSX.Element | null {
  const pathname = usePathname();
  const primeiraRota = useRef(true);

  useEffect(() => {
    if (!rastreamentoLigado) return;
    // O `PageView` da primeira carga já sai do próprio script de
    // inicialização abaixo; mandar de novo aqui contaria duas vezes.
    if (primeiraRota.current) {
      primeiraRota.current = false;
      return;
    }
    rastrear("pagina_vista");
  }, [pathname]);

  if (!rastreamentoLigado) return null;

  return (
    <>
      {metaPixelId ? (
        <Script id="meta-pixel" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window,document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init','${metaPixelId}');fbq('track','PageView');`}
        </Script>
      ) : null}

      {googleAdsId || gaMeasurementId ? (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${googleAdsId ?? gaMeasurementId}`}
            strategy="afterInteractive"
          />
          <Script id="google-gtag" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];
function gtag(){dataLayer.push(arguments)}
window.gtag=gtag;gtag('js',new Date());
${gaMeasurementId ? `gtag('config','${gaMeasurementId}');` : ""}
${googleAdsId ? `gtag('config','${googleAdsId}');` : ""}`}
          </Script>
        </>
      ) : null}
    </>
  );
}

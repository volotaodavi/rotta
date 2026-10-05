"use client";

import { usePathname } from "next/navigation";
import Script from "next/script";
import { useEffect, useRef, useState } from "react";

import { rastrear } from "../tracking";

import { getCookieConsent, subscribeCookieConsent } from "@/lib/cookie-consent";

/**
 * Máquina de desenvolvimento não mede. Evento de `next dev` entra no
 * MESMO Gerenciador de Eventos que o de produção, e o Meta não sabe
 * separar os dois: um `Purchase` de teste ensina o algoritmo a procurar
 * gente parecida com quem nunca ia pagar, e o orçamento passa a
 * perseguir o público errado.
 *
 * A checagem é por host, no navegador, e não por `NODE_ENV`: o layout
 * da landing é `"use client"`, e variável de ambiente sem o prefixo
 * `NEXT_PUBLIC_` não existe no bundle que roda lá.
 */
const HOSTS_SEM_MEDICAO = new Set(["localhost", "127.0.0.1", "[::1]", "0.0.0.0"]);

function hostPodeMedir(): boolean {
  if (typeof window === "undefined") return false;
  return !HOSTS_SEM_MEDICAO.has(window.location.hostname);
}

/**
 * Carrega o Pixel do Meta e a tag do Google Ads, e manda `PageView` a
 * cada troca de página. Montado só nas áreas PÚBLICAS (o site e as
 * telas de criar conta/entrar), nunca dentro do painel autenticado:
 * ver a nota de privacidade em `../tracking.ts`.
 *
 * Este é o ÚNICO ponto que decide se a medição existe, e ele exige duas
 * coisas ao mesmo tempo:
 *
 * 1. **Um identificador real** (`getMetaPixelId()` /
 *    `getGoogleAdsId()`, resolvidos no servidor e passados por prop).
 * 2. **Consentimento já dado** no banner de cookies.
 *
 * O portão do consentimento é o mesmo que já valia para o Google
 * Analytics (`components/google-analytics.tsx`), e vale aqui pela mesma
 * razão: Pixel e Analytics são a mesma categoria de cookie de terceiro,
 * a LGPD (art. 7º/8º) pede consentimento prévio e específico, e a
 * Política de Cookies da própria Rotta promete isso por escrito. Um
 * pixel que dispara antes do "Aceitar" desmentiria a página legal do
 * site. Reage em tempo real (`subscribeCookieConsent`): aceitar já liga
 * a medição na mesma visita, sem recarregar.
 *
 * GA4 não entra aqui de propósito — quem cuida dele é o
 * `GoogleAnalytics` do layout raiz. Configurar o mesmo Measurement ID
 * nos dois lugares carregaria o gtag duas vezes e contaria cada
 * visualização em dobro.
 *
 * `strategy="afterInteractive"`: o script de anúncio nunca disputa com
 * o conteúdo da página. Quem chegou pelo anúncio vê o site primeiro, e
 * a medição acontece logo depois.
 *
 * ## Sobre o `<noscript>` do código que o Meta entrega
 *
 * O trecho que o Meta dá para colar tem, no fim, um `<noscript>` com
 * uma imagem de 1x1 para contar quem navega sem JavaScript. Ele NÃO
 * entra aqui, e não é esquecimento: o React só escreve o conteúdo de um
 * `<noscript>` no HTML gerado no servidor, e no servidor este
 * componente ainda não sabe se houve consentimento (a decisão está no
 * `localStorage` do navegador), então devolve `null`. A imagem ficaria
 * como marcação morta, prometendo uma cobertura que não existe.
 *
 * Perder isso custa quase nada: medir quem desligou o JavaScript num
 * site que precisa de JavaScript para funcionar é medir ninguém. E a
 * validação do domínio no Gerenciador de Eventos não depende dessa
 * imagem: ela usa a `<meta>` de verificação
 * (`getFacebookDomainVerification()`, no layout raiz) ou um registro
 * DNS, nenhum dos dois dependente de script.
 */
export function MarketingTracking({
  metaPixelId,
  googleAdsId,
}: {
  metaPixelId?: string;
  googleAdsId?: string;
}): JSX.Element | null {
  const pathname = usePathname();
  const primeiraRota = useRef(true);
  const [liberado, setLiberado] = useState(false);

  useEffect(() => {
    const sincronizar = (): void =>
      setLiberado(getCookieConsent() === "accepted" && hostPodeMedir());
    sincronizar();
    return subscribeCookieConsent(sincronizar);
  }, []);

  const podeMedir = Boolean(metaPixelId || googleAdsId) && liberado;

  useEffect(() => {
    if (!podeMedir) return;
    // O `PageView` da primeira carga já sai do próprio script de
    // inicialização abaixo; mandar de novo aqui contaria duas vezes.
    if (primeiraRota.current) {
      primeiraRota.current = false;
      return;
    }
    rastrear("pagina_vista");
  }, [pathname, podeMedir]);

  if (!podeMedir) return null;

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

      {googleAdsId ? (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${googleAdsId}`}
            strategy="afterInteractive"
          />
          <Script id="google-gtag" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];
function gtag(){dataLayer.push(arguments)}
window.gtag=gtag;gtag('js',new Date());
gtag('config','${googleAdsId}');`}
          </Script>
        </>
      ) : null}
    </>
  );
}

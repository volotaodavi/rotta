"use client";

import { Button } from "@rotta/ui/web";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { getCookieConsent, setCookieConsent } from "@/lib/cookie-consent";

/**
 * Banner de consentimento de cookies (LGPD, art. 7º/8º) — só aparece
 * se `temRastreamento` for `true`, ou seja, se existe de fato alguma
 * medição de terceiro configurada: o Pixel do Meta
 * (`getMetaPixelId()`), o Google Ads (`getGoogleAdsId()`) ou o Google
 * Analytics (`getGoogleAnalyticsId()`). Sem nenhum deles, não há cookie
 * de terceiro rodando no site, e mostrar um banner de consentimento pra
 * nada seria só ruído, nunca "mais seguro por via das dúvidas".
 *
 * O prop deixou de se chamar `hasGoogleAnalytics` em 05/10/2026, quando
 * o Pixel do Meta entrou: o nome antigo mentiria sobre o que o banner
 * está pedindo permissão para fazer, e num banner de consentimento o
 * nome errado é o defeito mais caro que existe.
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
  temRastreamento,
}: {
  temRastreamento: boolean;
}): JSX.Element | null {
  const [mounted, setMounted] = useState(false);
  const [decided, setDecided] = useState(false);
  const bannerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMounted(true);
    setDecided(getCookieConsent() !== null);
  }, []);

  /**
   * Reserva, no fim da página, a altura exata que o banner ocupa.
   *
   * ## O defeito que isto conserta
   *
   * O banner é `fixed ... bottom-0`: ele flutua POR CIMA do conteúdo e
   * não ocupa espaço no documento. Num monitor largo isso é inofensivo,
   * porque o texto cabe numa linha e a faixa tem ~70px. Num celular o
   * mesmo texto quebra em cinco linhas e a faixa passa de 200px — um
   * quarto da tela de um iPhone.
   *
   * Aí ele cobre o ÚLTIMO elemento de qualquer página. Em 03/11/2026 a
   * suíte no tamanho de iPhone pegou o caso caro: na tela de cadastro,
   * o botão "Criar empresa" é o último elemento, e ficava inalcançável
   * — formulário preenchido, termos aceitos, e nada acontecia. Rolar
   * não resolvia: o documento já estava no fim. Ou seja, ninguém criava
   * conta pelo celular sem antes aceitar ou recusar os cookies, e nada
   * na tela dizia isso.
   *
   * ## Por que medir, e não um valor fixo
   *
   * Porque a altura depende da largura, do tamanho da fonte do sistema
   * e do idioma. Um `pb-56` chutado erraria em metade dos aparelhos, e
   * erraria para MENOS justamente nos mais estreitos, que são os que
   * têm o problema. O `ResizeObserver` acompanha qualquer mudança,
   * inclusive girar o aparelho.
   *
   * O espaço sai do `body` porque o banner vive no `layout` raiz e
   * vale para toda página. Some junto com o banner: no `return` da
   * limpeza, e também quando a pessoa decide (o componente desmonta).
   */
  useEffect(() => {
    const elemento = bannerRef.current;
    if (!elemento) return;

    const aplicar = (): void => {
      document.body.style.paddingBottom = `${elemento.offsetHeight}px`;
    };
    aplicar();

    const observador = new ResizeObserver(aplicar);
    observador.observe(elemento);

    return () => {
      observador.disconnect();
      document.body.style.paddingBottom = "";
    };
  }, [temRastreamento, mounted, decided]);

  if (!temRastreamento || !mounted || decided) return null;

  function decide(status: "accepted" | "rejected"): void {
    setCookieConsent(status);
    setDecided(true);
  }

  return (
    <div
      ref={bannerRef}
      role="region"
      aria-label="Consentimento de cookies"
      className="fixed inset-x-0 bottom-0 z-toast border-t border-border bg-surface-elevated p-4 shadow-lg"
    >
      <div className="mx-auto flex max-w-4xl flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-text-muted">
          Usamos cookies de medição para entender como o site é usado e para saber quais anúncios
          trazem gente de verdade. Nada de dado de família, aluno ou veículo é enviado. Você pode
          aceitar ou recusar: veja detalhes na{" "}
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

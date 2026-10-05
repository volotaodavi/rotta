"use client";

import { env } from "@/config/env";

/**
 * Medição de campanha (pedido do fundador, 05/10/2026: "preciso saber
 * onde e como colocar [o Pixel] para ele mandar os dados certinhos para
 * o gerenciador de anúncio do Meta Ads").
 *
 * ## O problema que isto resolve
 *
 * Um anúncio sem evento de conversão de volta é dinheiro no escuro: o
 * Meta e o Google só conseguem otimizar para "clique" porque é a última
 * coisa que eles veem. Quando a plataforma avisa "esta pessoa criou
 * conta" e "esta pessoa pagou", o algoritmo passa a procurar gente
 * parecida com quem pagou, e o mesmo orçamento rende outra coisa.
 *
 * ## Onde o fundador coloca o identificador
 *
 * Em variável de ambiente na Vercel, nunca no código:
 *
 * - `NEXT_PUBLIC_META_PIXEL_ID` (Meta: Gerenciador de Eventos, o número
 *   de 15 ou 16 dígitos do Pixel)
 * - `NEXT_PUBLIC_GOOGLE_ADS_ID` (Google Ads: "AW-XXXXXXXXXX")
 * - `NEXT_PUBLIC_GA_MEASUREMENT_ID` (GA4: "G-XXXXXXXXXX")
 *
 * Nenhuma é segredo (as três aparecem no HTML de qualquer site que as
 * usa), mas nenhuma pode ficar presa num commit: elas mudam de conta e
 * de ambiente. Sem a variável, nada carrega e nada quebra: as funções
 * daqui viram no-op silencioso, e o site continua idêntico.
 *
 * ## O que NUNCA é enviado
 *
 * Nome, e-mail, telefone, CPF, endereço, nome de aluno, posição de
 * veículo. Evento de marketing leva o que aconteceu e, quando for
 * compra, o valor. Dado pessoal de família e de criança não atravessa
 * para plataforma de anúncio, e isso não é preferência: é o que a LGPD
 * e os documentos legais da própria Rotta já exigem.
 *
 * Por isso também o rastreamento só existe nas áreas PÚBLICAS (o site e
 * as telas de criar conta/entrar). Dentro do painel autenticado, onde a
 * pessoa opera rota, aluno e pagamento, não entra pixel nenhum.
 */

/** Os eventos que a Rotta mede. Nome curto nosso, mapeado abaixo para cada plataforma. */
export type EventoDeMarketing =
  | "pagina_vista"
  | "cadastro_iniciado"
  | "cadastro_concluido"
  | "checkout_aberto"
  | "assinatura_paga"
  | "app_baixado"
  | "contato_enviado";

interface DadosDoEvento {
  /** Em reais, só em `assinatura_paga`. */
  valor?: number;
  /** "transportadora", "responsavel", "motorista", "escola". */
  publico?: string;
  /** Código do plano, quando houver. */
  plano?: string;
}

/**
 * Tradução para o vocabulário de cada plataforma. O Meta otimiza melhor
 * com os nomes padrão dele (Lead, InitiateCheckout, Purchase) do que
 * com evento personalizado, e é por isso que a tabela existe em vez de
 * mandar o nome da Rotta para os dois lados.
 */
const EVENTO_META: Record<EventoDeMarketing, { nome: string; padrao: boolean }> = {
  pagina_vista: { nome: "PageView", padrao: true },
  cadastro_iniciado: { nome: "StartTrial", padrao: true },
  cadastro_concluido: { nome: "Lead", padrao: true },
  checkout_aberto: { nome: "InitiateCheckout", padrao: true },
  assinatura_paga: { nome: "Purchase", padrao: true },
  app_baixado: { nome: "AppDownload", padrao: false },
  contato_enviado: { nome: "Contact", padrao: true },
};

const EVENTO_GOOGLE: Record<EventoDeMarketing, string> = {
  pagina_vista: "page_view",
  cadastro_iniciado: "begin_signup",
  cadastro_concluido: "sign_up",
  checkout_aberto: "begin_checkout",
  assinatura_paga: "purchase",
  app_baixado: "app_download",
  contato_enviado: "generate_lead",
};

declare global {
  interface Window {
    fbq?: ((...args: unknown[]) => void) & { queue?: unknown[] };
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

export const metaPixelId = env.NEXT_PUBLIC_META_PIXEL_ID;
export const googleAdsId = env.NEXT_PUBLIC_GOOGLE_ADS_ID;
export const gaMeasurementId = env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
export const rastreamentoLigado = Boolean(metaPixelId || googleAdsId || gaMeasurementId);

/**
 * Manda um evento para quem estiver configurado.
 *
 * Nunca lança: uma falha de rastreamento não pode derrubar um cadastro.
 * Chamar isto sem nenhuma variável configurada não faz nada, de
 * propósito, e é esse o estado do site hoje.
 */
export function rastrear(evento: EventoDeMarketing, dados: DadosDoEvento = {}): void {
  if (typeof window === "undefined") return;

  try {
    const meta = EVENTO_META[evento];
    if (metaPixelId && window.fbq) {
      window.fbq(
        meta.padrao ? "track" : "trackCustom",
        meta.nome,
        evento === "assinatura_paga"
          ? { value: dados.valor ?? 0, currency: "BRL", content_name: dados.plano }
          : { content_category: dados.publico, content_name: dados.plano },
      );
    }

    if ((googleAdsId || gaMeasurementId) && window.gtag) {
      window.gtag("event", EVENTO_GOOGLE[evento], {
        ...(evento === "assinatura_paga" ? { value: dados.valor ?? 0, currency: "BRL" } : {}),
        ...(dados.publico ? { publico: dados.publico } : {}),
        ...(dados.plano ? { plano: dados.plano } : {}),
      });
    }
  } catch {
    // Rastreamento é acessório. Bloqueador de anúncio, rede caída ou
    // script ainda não carregado não podem virar erro na cara de quem
    // está tentando criar conta.
  }
}

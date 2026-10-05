"use client";

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
 * ## De onde sai o identificador
 *
 * De `lib/site-config.ts`: `getMetaPixelId()`, `getGoogleAdsId()` e
 * `getGoogleAnalyticsId()`. O Pixel do Meta já tem o número da Rotta
 * embutido lá (não é segredo, e a razão está escrita no arquivo); os
 * dois do Google ainda dependem de `NEXT_PUBLIC_GOOGLE_ADS_ID` e
 * `NEXT_PUBLIC_GA_MEASUREMENT_ID`, porque as tags correspondentes
 * ainda não existem.
 *
 * As funções daqui não leem configuração nenhuma: elas olham se o
 * script da plataforma foi carregado (`window.fbq`, `window.gtag`) e,
 * se não foi, não fazem nada. Assim existe UM lugar que decide se mede
 * ou não (`MarketingTracking`, que respeita o consentimento), e é
 * impossível um evento escapar por um caminho que não passou por essa
 * decisão.
 *
 * ## Consentimento
 *
 * Nada carrega antes de a pessoa aceitar o banner de cookies (LGPD,
 * art. 7º/8º). O mesmo portão que já valia para o Google Analytics
 * vale para o Pixel: são a mesma categoria de cookie de terceiro, e
 * numa plataforma que lida com dado de criança essa régua não baixa.
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
  /**
   * Chave de deduplicação, quando o MESMO evento também é mandado pelo
   * servidor (API de Conversões). O Meta descarta a cópia: sem isto, uma
   * compra que os dois caminhos conseguiram ver viraria duas, e o custo
   * por aquisição apareceria pela metade do real.
   */
  eventoId?: string;
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

/**
 * Lê os cookies que o próprio Pixel do Meta criou neste navegador.
 *
 * `_fbc` guarda o clique no anúncio (o `fbclid` que veio na URL) e é o
 * único sinal que liga uma venda a um anúncio específico. `_fbp`
 * identifica o navegador.
 *
 * Isto existe porque o pagamento é confirmado no servidor, por webhook
 * da Asaas, minutos depois e possivelmente com o site já fechado: o
 * navegador manda estes dois valores junto do checkout para que a API
 * consiga, lá na frente, devolver a compra ao Meta com a campanha
 * certa (`MetaConversionsService`, no backend).
 *
 * Devolve vazio quando a pessoa não aceitou os cookies, chegou por fora
 * de anúncio ou usa bloqueador. Nesse caso a venda fica sem atribuição,
 * que é o resultado honesto.
 */
export function lerAtribuicaoDeCampanha(): { fbp?: string; fbc?: string } {
  if (typeof document === "undefined") return {};

  const ler = (nome: string): string | undefined => {
    const achado = document.cookie
      .split("; ")
      .find((parte) => parte.startsWith(`${nome}=`))
      ?.slice(nome.length + 1);
    return achado ? decodeURIComponent(achado) : undefined;
  };

  const fbp = ler("_fbp");
  const fbc = ler("_fbc");

  return { ...(fbp ? { fbp } : {}), ...(fbc ? { fbc } : {}) };
}

/**
 * Manda um evento para a plataforma cujo script estiver carregado.
 *
 * Nunca lança: uma falha de rastreamento não pode derrubar um
 * cadastro. Chamar isto antes do consentimento, ou com bloqueador de
 * anúncio ligado, não faz nada — `window.fbq` e `window.gtag` só
 * existem depois que `MarketingTracking` decidiu que pode medir.
 */
export function rastrear(evento: EventoDeMarketing, dados: DadosDoEvento = {}): void {
  if (typeof window === "undefined") return;

  try {
    const meta = EVENTO_META[evento];
    if (window.fbq) {
      window.fbq(
        meta.padrao ? "track" : "trackCustom",
        meta.nome,
        evento === "assinatura_paga"
          ? { value: dados.valor ?? 0, currency: "BRL", content_name: dados.plano }
          : { content_category: dados.publico, content_name: dados.plano },
        ...(dados.eventoId ? [{ eventID: dados.eventoId }] : []),
      );
    }

    if (window.gtag) {
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

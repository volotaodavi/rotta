import { registerAs } from "@nestjs/config";

export interface MetaAdsConfig {
  /** Token da API de Conversões (System User do Gerenciador de Negócios). SEGREDO. */
  accessToken: string | undefined;
  /**
   * Token da API de Marketing, com `ads_read` (ler desempenho) e, se o
   * fundador quiser, `ads_management` (pausar anúncio). SEGREDO.
   *
   * Separado do de Conversões de propósito: escrever evento e mexer em
   * verba são poderes diferentes, e juntar os dois num token só obriga
   * a dar o maior dos dois para conseguir o menor. Cai no de Conversões
   * quando não existir, porque um token com `ads_management` serve para
   * os dois usos e não faz sentido exigir dois cadastros de quem só tem
   * um token.
   */
  adsToken: string | undefined;
  /** O mesmo Pixel que o site carrega no navegador. Não é segredo. */
  pixelId: string;
  /** Versão da Graph API usada na URL. */
  apiVersion: string;
  /**
   * Conta de anúncio, no formato `act_<numero>`. Não é segredo: é
   * identificador de conta, aparece na URL do Gerenciador de Anúncios.
   * Sem ela, a leitura de campanha fica desligada.
   */
  adAccountId: string | undefined;
  /**
   * Código da aba "Testar eventos" do Gerenciador de Eventos. Quando
   * presente, o evento aparece lá e NÃO conta para a otimização de
   * campanha. Existe para conferir a integração sem sujar o histórico
   * de conversão, e deve sair depois do teste.
   */
  testEventCode: string | undefined;
}

/**
 * API de Conversões do Meta (Dossiê 26 / medição de campanha,
 * 05/10/2026) — o lado servidor do Pixel.
 *
 * ## Por que existe, se o Pixel do navegador já manda eventos
 *
 * Porque o evento que mais importa, a assinatura paga, o navegador
 * nunca vê acontecer. O Pix é confirmado por webhook da Asaas, minutos
 * depois, com a pessoa possivelmente já fora do site. O Pixel só
 * consegue disparar `Purchase` se a aba ainda estiver aberta no momento
 * do retorno, e some inteiro quando a pessoa fecha o navegador,
 * bloqueia script de anúncio ou está num iOS com rastreamento limitado.
 * Sem isto, a Rotta pagaria por anúncio otimizado em cima de uma
 * fração dos pagamentos reais.
 *
 * ## Stub honesto
 *
 * Sem `META_CAPI_ACCESS_TOKEN`, nada é enviado e nada quebra: o webhook
 * da Asaas segue o caminho normal e só registra em log que a medição
 * está desligada. Mesmo padrão de `AsaasConfig` e `LytexConfig`.
 *
 * O `pixelId` tem padrão embutido porque não é segredo (vai no HTML do
 * site, é o mesmo número que o navegador carrega). O token é segredo de
 * verdade: dá para escrever eventos na conta de anúncio e só pode viver
 * em variável de ambiente.
 */
export default registerAs("metaAds", (): MetaAdsConfig => ({
  accessToken: process.env.META_CAPI_ACCESS_TOKEN || undefined,
  adsToken: process.env.META_ADS_ACCESS_TOKEN || process.env.META_CAPI_ACCESS_TOKEN || undefined,
  pixelId: process.env.META_PIXEL_ID || "2122632155047063",
  adAccountId: process.env.META_AD_ACCOUNT_ID || undefined,
  apiVersion: process.env.META_GRAPH_API_VERSION || "v21.0",
  testEventCode: process.env.META_CAPI_TEST_EVENT_CODE || undefined,
}));

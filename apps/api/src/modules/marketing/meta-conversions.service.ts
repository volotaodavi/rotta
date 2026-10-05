import { createHash } from "node:crypto";

import { Inject, Injectable, Logger } from "@nestjs/common";
import { ConfigType } from "@nestjs/config";

import metaAdsConfig from "@/config/meta-ads.config";
import { IntegrationHealthService } from "@/infra/observability/integration-health.service";

export const META_INTEGRATION_NAME = "meta-conversions";

/**
 * Sinais de atribuição coletados no navegador de quem iniciou o
 * checkout, guardados junto do pagamento pendente.
 *
 * `fbc` é o identificador do CLIQUE no anúncio (o `fbclid` da URL,
 * guardado em cookie pelo próprio Pixel) e é o único campo que liga uma
 * venda a um anúncio específico. `fbp` identifica o navegador. Nenhum
 * dos dois é dado pessoal declarado: são identificadores que o Meta já
 * criou e já tem, devolvidos para ele.
 */
export interface AtribuicaoDoNavegador {
  fbp?: string | null;
  fbc?: string | null;
  userAgent?: string | null;
  ip?: string | null;
}

export interface CompraParaOMeta {
  /**
   * Chave de deduplicação. O navegador manda o mesmo valor no evento
   * dele, e o Meta descarta a cópia: sem isto, uma compra que o Pixel
   * conseguiu ver viraria duas, e o custo por aquisição apareceria pela
   * metade do real.
   */
  eventId: string;
  valorCentavos: number;
  /** Quando o pagamento foi confirmado de verdade, não quando este código rodou. */
  ocorridoEm: Date;
  /** Opaco, interno (id do pagamento pendente ou da empresa). Nunca e-mail, CPF ou telefone. */
  referenciaInterna?: string | null;
  atribuicao?: AtribuicaoDoNavegador;
}

/** O Meta exige SHA-256 em minúsculas nos campos de `user_data`. */
function hash(valor: string): string {
  return createHash("sha256").update(valor.trim().toLowerCase()).digest("hex");
}

/**
 * Envia conversões para a API de Conversões do Meta (o lado servidor do
 * Pixel).
 *
 * ## O que NUNCA sai daqui
 *
 * Nem e-mail, nem telefone, nem CPF, nem nome, nem dado de aluno, nem
 * posição de veículo. Nem em texto limpo, nem com hash.
 *
 * O formato da API aceita `em` e `ph` (e-mail e telefone com SHA-256), e
 * é o que praticamente todo mundo manda, porque melhora a taxa de
 * correspondência. A Rotta não manda, por três razões que se somam:
 *
 * 1. Hash não é anonimização. Um SHA-256 de e-mail é pseudônimo, não
 *    anônimo: quem já tem a lista de e-mails descobre quem é em
 *    segundos. Para a LGPD continua sendo dado pessoal, e enviá-lo para
 *    uma plataforma de anúncio exige base legal própria e aviso claro.
 * 2. A Política de Cookies e a Política de Privacidade da Rotta dizem,
 *    por escrito e em público, que nome, e-mail, telefone e CPF nunca
 *    são enviados para plataforma de anúncio. Mandar o hash aqui
 *    desmentiria as duas.
 * 3. Não é necessário. `fbc` (o clique no anúncio), `fbp` (o
 *    navegador), IP e user agent já são o que liga a venda à campanha, e
 *    o `fbc` em particular é um casamento exato, não probabilístico.
 *
 * `external_id` vai com hash de um id interno da Rotta (pagamento ou
 * empresa). É opaco: não diz quem a pessoa é nem fora da Rotta nem
 * dentro do Meta, e serve só para o Meta juntar eventos da mesma
 * jornada.
 *
 * ## Nunca derruba o pagamento
 *
 * Todo método engole a própria falha. Esta chamada acontece dentro do
 * tratamento do webhook da Asaas, e marketing não pode ser o motivo de
 * uma confirmação de pagamento falhar: o pior caso aceitável é uma
 * conversão não medida, nunca um cliente que pagou e não foi ativado.
 */
@Injectable()
export class MetaConversionsService {
  private readonly logger = new Logger(MetaConversionsService.name);

  constructor(
    @Inject(metaAdsConfig.KEY)
    private readonly config: ConfigType<typeof metaAdsConfig>,
    private readonly integrationHealth: IntegrationHealthService,
  ) {}

  isConfigured(): boolean {
    return Boolean(this.config.accessToken);
  }

  /**
   * `Purchase`, disparado quando a Asaas confirma o dinheiro. Devolve
   * `true` só quando o Meta aceitou o evento.
   */
  async registrarCompra(compra: CompraParaOMeta): Promise<boolean> {
    if (!this.isConfigured()) {
      void this.integrationHealth.recordNotConfigured(
        META_INTEGRATION_NAME,
        "META_CAPI_ACCESS_TOKEN ausente: conversão não enviada ao Meta.",
      );
      return false;
    }

    const userData: Record<string, unknown> = {};
    const atribuicao = compra.atribuicao ?? {};
    if (atribuicao.fbp) userData.fbp = atribuicao.fbp;
    if (atribuicao.fbc) userData.fbc = atribuicao.fbc;
    if (atribuicao.ip) userData.client_ip_address = atribuicao.ip;
    if (atribuicao.userAgent) userData.client_user_agent = atribuicao.userAgent;
    if (compra.referenciaInterna) userData.external_id = hash(compra.referenciaInterna);

    /*
      O Meta recusa o evento inteiro quando `user_data` vem vazio. Sem
      nenhum sinal, o evento não teria como ser atribuído a campanha
      nenhuma de qualquer jeito: desistir aqui é mais honesto que mandar
      um evento que só engorda o total e não informa nada.
    */
    if (Object.keys(userData).length === 0) {
      this.logger.warn(
        `Compra ${compra.eventId} sem nenhum sinal de atribuição: nada enviado ao Meta.`,
      );
      return false;
    }

    return this.enviar({
      event_name: "Purchase",
      event_time: Math.floor(compra.ocorridoEm.getTime() / 1000),
      event_id: compra.eventId,
      action_source: "website",
      user_data: userData,
      custom_data: {
        currency: "BRL",
        value: Number((compra.valorCentavos / 100).toFixed(2)),
      },
    });
  }

  private async enviar(evento: Record<string, unknown>): Promise<boolean> {
    const url = `https://graph.facebook.com/${this.config.apiVersion}/${this.config.pixelId}/events`;
    const corpo: Record<string, unknown> = {
      data: [evento],
      access_token: this.config.accessToken,
    };
    if (this.config.testEventCode) corpo.test_event_code = this.config.testEventCode;

    const iniciadoEm = Date.now();
    try {
      const resposta = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(corpo),
      });

      if (!resposta.ok) {
        const texto = await resposta.text().catch(() => "");
        /*
          O corpo de erro do Meta pode ecoar o que foi enviado. Só o
          começo entra em log, e nunca o `access_token`, que viaja no
          corpo da requisição e não aqui.
        */
        const resumo = texto.slice(0, 300);
        this.logger.warn(`Meta recusou o evento (HTTP ${resposta.status}): ${resumo}`);
        void this.integrationHealth.recordFailure(
          META_INTEGRATION_NAME,
          `HTTP ${resposta.status} ao enviar ${String(evento.event_name)}.`,
        );
        return false;
      }

      void this.integrationHealth.recordSuccess(META_INTEGRATION_NAME, Date.now() - iniciadoEm);
      return true;
    } catch (erro) {
      this.logger.warn(
        `Falha de rede ao enviar evento ao Meta: ${erro instanceof Error ? erro.message : String(erro)}`,
      );
      void this.integrationHealth.recordFailure(
        META_INTEGRATION_NAME,
        "Falha de rede ao falar com a Graph API.",
      );
      return false;
    }
  }
}

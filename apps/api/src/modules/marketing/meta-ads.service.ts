import { Inject, Injectable, Logger } from "@nestjs/common";
import { ConfigType } from "@nestjs/config";

import metaAdsConfig from "@/config/meta-ads.config";

/** Um anúncio, campanha ou conjunto, com o que ele custou e o que trouxe. */
export interface DesempenhoDeCampanha {
  id: string;
  nome: string;
  status: string;
  gastoEmReais: number;
  impressoes: number;
  cliques: number;
  cadastros: number;
  compras: number;
  custoPorCadastroEmReais: number | null;
  custoPorCompraEmReais: number | null;
}

export interface LeituraDeCampanhas {
  periodo: string;
  contaDeAnuncio: string;
  campanhas: DesempenhoDeCampanha[];
  /** Totais da conta, para não ter que somar na mão e errar. */
  total: {
    gastoEmReais: number;
    cadastros: number;
    compras: number;
    custoPorCompraEmReais: number | null;
  };
}

/** Por que a leitura não aconteceu, em texto que vai direto para o relatório. */
export class MetaAdsIndisponivel extends Error {}

interface LinhaDeInsight {
  campaign_id?: string;
  campaign_name?: string;
  spend?: string;
  impressions?: string;
  clicks?: string;
  actions?: { action_type: string; value: string }[];
}

/**
 * A API de Marketing do Meta, para o CMO ver campanha de verdade.
 *
 * ## Por que existe
 *
 * Pedido do fundador em 05/10/2026: "quero que ele veja os dados
 * concretos, possa alterar algumas questões no Meta Ads caso seja
 * necessário, diretamente pelo Meta. De verdade, sem especulação".
 *
 * Sem isto, o CMO vê o funil da própria Rotta (quantos chegaram, quantos
 * pagaram) mas não vê o outro lado da conta: quanto custou trazer essa
 * gente. Os dois juntos é que formam a única pergunta que importa em
 * anúncio, que é se cada real gasto volta.
 *
 * ## Por que o token vive aqui e não no agente
 *
 * Porque um token com `ads_management` gasta dinheiro. Ele fica em
 * variável de ambiente do servidor, e o agente fala com um endpoint
 * estreito, que só sabe fazer duas coisas. Dar o token direto ao turno
 * agendado seria dar a conta de anúncio inteira a um processo que roda
 * sozinho de madrugada.
 *
 * ## A regra da escrita: só reduzir
 *
 * A única escrita implementada é PAUSAR. Nunca criar anúncio, nunca
 * subir orçamento, nunca mudar público. É uma assimetria de propósito:
 * pausar só pode diminuir o gasto, então o pior erro possível do agente
 * é desligar um anúncio que estava indo bem, o que custa oportunidade e
 * se desfaz em um clique. Subir verba erra para o outro lado, e esse
 * não se desfaz.
 */
@Injectable()
export class MetaAdsService {
  private readonly logger = new Logger(MetaAdsService.name);

  constructor(
    @Inject(metaAdsConfig.KEY)
    private readonly config: ConfigType<typeof metaAdsConfig>,
  ) {}

  isConfigured(): boolean {
    return Boolean(this.config.adsToken && this.config.adAccountId);
  }

  /**
   * Desempenho por campanha. `periodo` segue os apelidos do Meta:
   * `today`, `yesterday`, `last_7d`, `last_30d`, `this_month`.
   */
  async lerCampanhas(periodo = "last_30d"): Promise<LeituraDeCampanhas> {
    if (!this.isConfigured()) {
      throw new MetaAdsIndisponivel(
        "Leitura de campanha desligada: falta META_ADS_ACCESS_TOKEN (com ads_read) ou META_AD_ACCOUNT_ID.",
      );
    }

    const conta = this.config.adAccountId as string;
    const parametros = new URLSearchParams({
      level: "campaign",
      date_preset: periodo,
      fields: "campaign_id,campaign_name,spend,impressions,clicks,actions",
      limit: "100",
    });

    const corpo = await this.buscar<{ data: LinhaDeInsight[] }>(
      `${conta}/insights?${parametros.toString()}`,
    );

    const campanhas = (corpo.data ?? []).map((linha) => this.mapear(linha));
    const gasto = campanhas.reduce((soma, c) => soma + c.gastoEmReais, 0);
    const compras = campanhas.reduce((soma, c) => soma + c.compras, 0);

    return {
      periodo,
      contaDeAnuncio: conta,
      campanhas,
      total: {
        gastoEmReais: Number(gasto.toFixed(2)),
        cadastros: campanhas.reduce((soma, c) => soma + c.cadastros, 0),
        compras,
        custoPorCompraEmReais: compras > 0 ? Number((gasto / compras).toFixed(2)) : null,
      },
    };
  }

  /**
   * Pausa uma campanha. Devolve o que o Meta respondeu.
   *
   * Exige `ads_management` no token: com `ads_read` o Meta recusa, e a
   * mensagem de erro diz exatamente isso, que é o comportamento certo
   * para quem quer dar só leitura ao agente.
   */
  async pausarCampanha(campanhaId: string): Promise<{ pausada: boolean }> {
    if (!this.config.adsToken) {
      throw new MetaAdsIndisponivel("Pausa indisponível: META_ADS_ACCESS_TOKEN ausente.");
    }

    const resposta = await fetch(
      `https://graph.facebook.com/${this.config.apiVersion}/${encodeURIComponent(campanhaId)}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.config.adsToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: "PAUSED" }),
      },
    );

    const texto = await resposta.text().catch(() => "");
    if (!resposta.ok) {
      this.logger.warn(`Meta recusou pausar ${campanhaId}: HTTP ${resposta.status} ${texto}`);
      throw new MetaAdsIndisponivel(
        `O Meta recusou pausar a campanha (HTTP ${resposta.status}). ${this.resumirErro(texto)}`,
      );
    }

    this.logger.log(`Campanha ${campanhaId} pausada pela diretoria.`);
    return { pausada: true };
  }

  private async buscar<T>(caminho: string): Promise<T> {
    const resposta = await fetch(
      `https://graph.facebook.com/${this.config.apiVersion}/${caminho}`,
      { headers: { Authorization: `Bearer ${this.config.adsToken as string}` } },
    );

    const texto = await resposta.text().catch(() => "");
    if (!resposta.ok) {
      this.logger.warn(`Meta recusou ${caminho}: HTTP ${resposta.status} ${texto}`);
      throw new MetaAdsIndisponivel(
        `O Meta recusou a leitura (HTTP ${resposta.status}). ${this.resumirErro(texto)}`,
      );
    }

    return JSON.parse(texto) as T;
  }

  /**
   * O erro do Meta vem num envelope grande. Só a mensagem sai, e cortada:
   * o corpo de erro às vezes ecoa o que foi enviado, e o token viaja no
   * cabeçalho desta chamada.
   */
  private resumirErro(texto: string): string {
    try {
      const corpo = JSON.parse(texto) as { error?: { message?: string } };
      return (corpo.error?.message ?? "").slice(0, 200);
    } catch {
      return texto.slice(0, 200);
    }
  }

  private mapear(linha: LinhaDeInsight): DesempenhoDeCampanha {
    const acao = (tipo: string): number =>
      Number(linha.actions?.find((a) => a.action_type === tipo)?.value ?? 0);

    const gasto = Number(linha.spend ?? 0);
    /*
      O Meta nomeia a conversão pelo evento padrão que o Pixel manda.
      `lead` é o nosso `cadastro_concluido` e `purchase` é o
      `assinatura_paga` (ver `apps/web/src/features/marketing/tracking.ts`).
    */
    const cadastros = acao("lead") + acao("offsite_conversion.fb_pixel_lead");
    const compras = acao("purchase") + acao("offsite_conversion.fb_pixel_purchase");

    return {
      id: linha.campaign_id ?? "",
      nome: linha.campaign_name ?? "(sem nome)",
      status: "",
      gastoEmReais: Number(gasto.toFixed(2)),
      impressoes: Number(linha.impressions ?? 0),
      cliques: Number(linha.clicks ?? 0),
      cadastros,
      compras,
      custoPorCadastroEmReais: cadastros > 0 ? Number((gasto / cadastros).toFixed(2)) : null,
      custoPorCompraEmReais: compras > 0 ? Number((gasto / compras).toFixed(2)) : null,
    };
  }
}

import {
  BadGatewayException,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiExcludeController } from "@nestjs/swagger";

import { FunilService, type FunilDaRotta } from "./funil.service";
import { MetaAdsIndisponivel, MetaAdsService, type LeituraDeCampanhas } from "./meta-ads.service";

import { Public } from "@/common/decorators/public.decorator";
import { DiretoriaReadGuard } from "@/modules/client-errors/diretoria-read.guard";

/**
 * O que a diretoria de agentes enxerga de marketing (ver `empresa/` na
 * raiz do repositório).
 *
 * Mesmo desenho do plantão de erro do CTO, e pelas mesmas razões: um
 * turno agendado roda sozinho, sem ninguém para digitar senha, e dar a
 * ele uma conta de admin seria dar a plataforma inteira. `@Public()`
 * tira o JWT do caminho e quem autentica é o `DiretoriaReadGuard`, pelo
 * segredo de cabeçalho `x-rotta-diretoria-token`. Sem o segredo
 * configurado, recusa tudo.
 *
 * As três rotas são estreitas de propósito: ler o funil, ler campanha e
 * pausar campanha. Não existe rota para criar anúncio, subir orçamento
 * ou mudar público, e a razão está em `meta-ads.service.ts`: pausar só
 * reduz gasto, e é o único poder cujo pior erro se desfaz num clique.
 */
@ApiExcludeController()
@Controller("marketing")
export class MarketingController {
  constructor(
    private readonly funil: FunilService,
    private readonly metaAds: MetaAdsService,
  ) {}

  @Public()
  @UseGuards(DiretoriaReadGuard)
  @Get("funil")
  levantarFunil(): Promise<FunilDaRotta> {
    return this.funil.levantar();
  }

  /**
   * Desempenho das campanhas no Meta. `periodo` aceita os apelidos do
   * Meta (`today`, `yesterday`, `last_7d`, `last_30d`, `this_month`).
   */
  @Public()
  @UseGuards(DiretoriaReadGuard)
  @Get("campanhas")
  async lerCampanhas(@Query("periodo") periodo?: string): Promise<LeituraDeCampanhas> {
    try {
      return await this.metaAds.lerCampanhas(periodo || "last_30d");
    } catch (erro) {
      throw this.traduzir(erro);
    }
  }

  @Public()
  @UseGuards(DiretoriaReadGuard)
  @Post("campanhas/:id/pausar")
  async pausar(@Param("id") id: string): Promise<{ pausada: boolean }> {
    try {
      return await this.metaAds.pausarCampanha(id);
    } catch (erro) {
      throw this.traduzir(erro);
    }
  }

  /**
   * A falha vira 502 com a razão em texto, nunca 500 genérico: quem lê
   * isto é um agente que vai escrever um relatório, e "o Meta recusou,
   * falta ads_read no token" é acionável, enquanto "erro interno" faz
   * ele chutar.
   */
  private traduzir(erro: unknown): Error {
    if (erro instanceof MetaAdsIndisponivel) {
      return new BadGatewayException(erro.message);
    }
    return erro instanceof Error ? erro : new Error(String(erro));
  }
}

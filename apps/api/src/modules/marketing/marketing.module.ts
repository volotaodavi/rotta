import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { FunilService } from "./funil.service";
import { MarketingController } from "./marketing.controller";
import { MetaConversionsService } from "./meta-conversions.service";

import metaAdsConfig from "@/config/meta-ads.config";
import { DiretoriaReadGuard } from "@/modules/client-errors/diretoria-read.guard";

/**
 * Medição de campanha do lado do servidor (05/10/2026).
 *
 * Só tem uma peça hoje, a API de Conversões do Meta, e existe como
 * módulo próprio em vez de virar mais um provider dentro de `Billing`
 * por uma razão de fronteira: cobrança é o negócio da Rotta e não pode
 * depender de marketing. A seta aponta só num sentido, `Billing` usa
 * `Marketing`, e é por isso que `MetaConversionsService` engole as
 * próprias falhas em vez de propagá-las.
 */
@Module({
  imports: [ConfigModule.forFeature(metaAdsConfig)],
  controllers: [MarketingController],
  providers: [MetaConversionsService, FunilService, DiretoriaReadGuard],
  exports: [MetaConversionsService],
})
export class MarketingModule {}

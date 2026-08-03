import { Module } from "@nestjs/common";


import { RottaAiController } from "./rotta-ai.controller";
import { RottaAiService } from "./rotta-ai.service";

import { GeoModule } from "@/modules/geo/geo.module";

/**
 * Importa `GeoModule` só para `analyzeSchoolAddress` chamar o
 * `GeoEngineService` de verdade (briefing "ROTTA GEO PLATFORM" —
 * geocodificação de endereço, agora implementada, deixa de ser stub).
 * Os demais métodos (`validateDocument`/`analyzeVehicleDocument`/
 * `validarContratoAssinado`) continuam stub honesto — nenhum provedor
 * de OCR/visão computacional/análise documental foi contratado.
 */
@Module({
  imports: [GeoModule],
  controllers: [RottaAiController],
  providers: [RottaAiService],
  exports: [RottaAiService],
})
export class RottaAiModule {}

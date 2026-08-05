import { Module } from "@nestjs/common";

import { RottaAiController } from "./rotta-ai.controller";
import { RottaAiService } from "./rotta-ai.service";

import { DiditModule } from "@/infra/didit/didit.module";
import { GeoModule } from "@/modules/geo/geo.module";

/**
 * Importa `GeoModule` para `analyzeSchoolAddress` chamar o
 * `GeoEngineService` de verdade (briefing "ROTTA GEO PLATFORM") e
 * `DiditModule` para `validateDocument` chamar a Didit de verdade nos
 * tipos CNH/SELFIE/FACE_MATCH/OCR (briefing "Rotta AI"). Os demais
 * métodos (`analyzeVehicleDocument`/`validarContratoAssinado`, e os
 * tipos EAR/CURSO de `validateDocument`) continuam stub honesto —
 * nenhum provedor cobre documento de veículo/certificado específico ou
 * análise de contrato assinado.
 */
@Module({
  imports: [GeoModule, DiditModule],
  controllers: [RottaAiController],
  providers: [RottaAiService],
  exports: [RottaAiService],
})
export class RottaAiModule {}

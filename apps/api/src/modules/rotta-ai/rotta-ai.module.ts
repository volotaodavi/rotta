import { Module } from "@nestjs/common";

import { RottaAiController } from "./rotta-ai.controller";
import { RottaAiService } from "./rotta-ai.service";

import { DiditModule } from "@/infra/didit/didit.module";
import { GeoModule } from "@/modules/geo/geo.module";

/**
 * Importa `GeoModule` para `analyzeSchoolAddress`/`suggestRouteOptimization`
 * chamarem o `GeoEngineService` de verdade (briefing "ROTTA GEO
 * PLATFORM" — geocodificação e, desde a Frente D, o Rotta Route AI via
 * OSRM `/trip`) e `DiditModule` para `validateDocument` chamar a Didit
 * de verdade nos tipos CNH/SELFIE/FACE_MATCH/OCR (briefing "Rotta AI").
 * `suggestRouteOptimization` lê `Route`/`RouteStop` direto via
 * `PrismaService` (global, não precisa import aqui — ver o porquê no
 * doc comment do método em `RottaAiService`, para não criar um ciclo
 * com `RoutesModule`). `analyzeVehicleDocument` (Frente E) não precisa
 * de import nenhum — só faz `fetch()` nativo + leitura de bytes
 * (`readImageMetadata`), sem provedor externo. `validarContratoAssinado`
 * e os tipos EAR/CURSO de `validateDocument` continuam stub honesto —
 * nenhum provedor cobre análise de contrato assinado ou certificado
 * específico (DETRAN/curso).
 */
@Module({
  imports: [GeoModule, DiditModule],
  controllers: [RottaAiController],
  providers: [RottaAiService],
  exports: [RottaAiService],
})
export class RottaAiModule {}

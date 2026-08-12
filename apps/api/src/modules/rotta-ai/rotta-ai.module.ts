import { Module } from "@nestjs/common";

import { RottaAiController } from "./rotta-ai.controller";
import { RottaAiService } from "./rotta-ai.service";

import { DiditModule } from "@/infra/didit/didit.module";
import { AuditModule } from "@/modules/audit/audit.module";
import { GeoModule } from "@/modules/geo/geo.module";


/**
 * Importa `GeoModule` para `analyzeSchoolAddress`/`suggestRouteOptimization`
 * chamarem o `GeoEngineService` de verdade (briefing "ROTTA GEO
 * PLATFORM" — geocodificação e, desde a Frente D, o Rotta Route AI via
 * OSRM `/trip`) e `DiditModule` para `validateDocument` chamar a Didit
 * de verdade nos tipos CNH/SELFIE/FACE_MATCH/OCR (briefing "Rotta AI").
 * `AuditModule` é o que permite `validarContratoAssinado` (Frente I)
 * ler o audit trail de assinatura (`AuditLogService.listByEntity`) sem
 * importar `MarketplaceModule` inteiro (que já importa `RottaAiModule`
 * — importar de volta criaria um ciclo, mesmo raciocínio do porquê
 * `suggestRouteOptimization` lê `Route`/`RouteStop` direto via
 * `PrismaService`, global, sem precisar de `RoutesModule` aqui).
 * `analyzeVehicleDocument` (Frente E) e `analyzeDriverDocument` (Frente
 * F, tipos EAR/CURSO) não precisam de import nenhum — só fazem
 * `fetch()` nativo + leitura de bytes (`readImageMetadata`), sem
 * provedor externo.
 */
@Module({
  imports: [GeoModule, DiditModule, AuditModule],
  controllers: [RottaAiController],
  providers: [RottaAiService],
  exports: [RottaAiService],
})
export class RottaAiModule {}

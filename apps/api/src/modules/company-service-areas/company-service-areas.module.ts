import { Module } from "@nestjs/common";

import { CompanyServiceAreasController } from "./company-service-areas.controller";
import { CompanyServiceAreasService } from "./company-service-areas.service";

import { CompanyTagsService } from "@/modules/companies/company-tags.service";

/**
 * Área de atuação da transportadora (fluxo público, 22/09/2026).
 *
 * Módulo próprio, e não um pedaço de `CompaniesModule`, por uma razão
 * de dependência: quem CONSOME esta regra é `SchoolsModule` (o guard de
 * credenciamento em `linkCompany`), e `CompaniesModule` já puxa
 * `VehiclesModule -> RottaAiModule -> GeoModule -> SchoolsModule`.
 * Importar `CompaniesModule` de dentro de `SchoolsModule` fecharia esse
 * ciclo. Este módulo não importa ninguém, então pode ser importado por
 * qualquer um.
 *
 * `CompanyTagsService` é declarado aqui como PROVIDER, e não importado
 * de `CompaniesModule` — importar aquele módulo fecharia exatamente o
 * ciclo descrito acima. Dá certo porque o serviço só depende de
 * `PrismaService`, que é `@Global()`: são duas instâncias da mesma
 * classe sem estado, lendo o mesmo banco, não duas fontes de verdade.
 */
@Module({
  controllers: [CompanyServiceAreasController],
  providers: [CompanyServiceAreasService, CompanyTagsService],
  exports: [CompanyServiceAreasService],
})
export class CompanyServiceAreasModule {}

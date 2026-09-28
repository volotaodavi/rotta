import { Module } from "@nestjs/common";

import { COMPANY_SERVICE_AREA_REPOSITORY } from "./company-service-areas.constants";
import { CompanyServiceAreasController } from "./company-service-areas.controller";
import { CompanyServiceAreasService } from "./company-service-areas.service";
import { PrismaCompanyServiceAreaRepository } from "./repositories/prisma-company-service-area.repository";

import { COMPANY_REPOSITORY } from "@/modules/companies/companies.constants";
import { CompanyTagsService } from "@/modules/companies/company-tags.service";
import { PrismaCompanyRepository } from "@/modules/companies/repositories/prisma-company.repository";
import { PrismaSchoolCompanyLinkRepository } from "@/modules/schools/repositories/prisma-school-company-link.repository";
import { PrismaSchoolRepository } from "@/modules/schools/repositories/prisma-school.repository";
import {
  SCHOOL_COMPANY_LINK_REPOSITORY,
  SCHOOL_REPOSITORY,
} from "@/modules/schools/schools.constants";

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
 * ## Por que tantos providers "de fora" aqui
 *
 * `CompanyTagsService` e os repositórios de `CompaniesModule`/
 * `SchoolsModule` são declarados como PROVIDERS locais, e não obtidos
 * importando aqueles módulos — importar qualquer um dos dois fecharia
 * exatamente o ciclo descrito acima (`SchoolsModule` importa ESTE
 * módulo). São IMPORTS DE ARQUIVO, não de módulo: nenhum `imports:`
 * aponta para lá.
 *
 * Dá certo porque todas essas classes são sem estado e dependem só de
 * `PrismaService`, que é `@Global()`. São outras instâncias das mesmas
 * classes lendo o mesmo banco — não outras fontes de verdade. A
 * alternativa seria este serviço voltar a falar com o Prisma direto,
 * que é justamente a lacuna que a auditoria de 26/09/2026 (item 5)
 * fechou.
 */
@Module({
  controllers: [CompanyServiceAreasController],
  providers: [
    CompanyServiceAreasService,
    CompanyTagsService,
    { provide: COMPANY_SERVICE_AREA_REPOSITORY, useClass: PrismaCompanyServiceAreaRepository },
    { provide: COMPANY_REPOSITORY, useClass: PrismaCompanyRepository },
    { provide: SCHOOL_REPOSITORY, useClass: PrismaSchoolRepository },
    { provide: SCHOOL_COMPANY_LINK_REPOSITORY, useClass: PrismaSchoolCompanyLinkRepository },
  ],
  exports: [CompanyServiceAreasService],
})
export class CompanyServiceAreasModule {}

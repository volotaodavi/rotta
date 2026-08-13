import { Module } from "@nestjs/common";


import { COMPANY_JOIN_REQUEST_REPOSITORY } from "./company-join-requests.constants";
import { CompanyJoinRequestsController } from "./company-join-requests.controller";
import { CompanyJoinRequestsService } from "./company-join-requests.service";
import { PrismaCompanyJoinRequestRepository } from "./repositories/prisma-company-join-request.repository";

import { AuditModule } from "@/modules/audit/audit.module";
import { CompaniesModule } from "@/modules/companies/companies.module";
import { UsersModule } from "@/modules/users/users.module";

/**
 * Módulo `CompanyJoinRequests` (Frente N, briefing item 9) — importa
 * `CompaniesModule` só por `COMPANY_REPOSITORY` (resolver
 * `Company.codigoInterno`), nunca reimplementa acesso a `Prisma.company`.
 * `UsersModule` (criar `Membership` na aprovação, limpar
 * `User.autonomoRole`) e `AuditModule` (trilha de aprovação/recusa),
 * mesmo padrão de `InvitesService`/`MarketplaceModule`.
 */
@Module({
  imports: [CompaniesModule, UsersModule, AuditModule],
  controllers: [CompanyJoinRequestsController],
  providers: [
    CompanyJoinRequestsService,
    { provide: COMPANY_JOIN_REQUEST_REPOSITORY, useClass: PrismaCompanyJoinRequestRepository },
  ],
})
export class CompanyJoinRequestsModule {}

import { Module } from "@nestjs/common";

import { COMPANY_JOIN_PRE_REGISTRATION_REPOSITORY } from "./company-join-pre-registrations.constants";
import { CompanyJoinPreRegistrationsController } from "./company-join-pre-registrations.controller";
import { CompanyJoinPreRegistrationsService } from "./company-join-pre-registrations.service";
import { PrismaCompanyJoinPreRegistrationRepository } from "./repositories/prisma-company-join-pre-registration.repository";

import { AuditModule } from "@/modules/audit/audit.module";

/**
 * Módulo `CompanyJoinPreRegistrations` (pedido do usuário 02/09/2026,
 * tela "Convites"). Exporta o repository token — `CompanyJoinRequestsModule`
 * importa este módulo só por ele, pra `CompanyJoinRequestsService.create`
 * conseguir checar o match sem passar por este `Service` (mesmo padrão
 * de `StudentPreRegistrationsModule` exportando o repository pro
 * `StudentsModule`).
 */
@Module({
  imports: [AuditModule],
  controllers: [CompanyJoinPreRegistrationsController],
  providers: [
    CompanyJoinPreRegistrationsService,
    {
      provide: COMPANY_JOIN_PRE_REGISTRATION_REPOSITORY,
      useClass: PrismaCompanyJoinPreRegistrationRepository,
    },
  ],
  exports: [COMPANY_JOIN_PRE_REGISTRATION_REPOSITORY, CompanyJoinPreRegistrationsService],
})
export class CompanyJoinPreRegistrationsModule {}

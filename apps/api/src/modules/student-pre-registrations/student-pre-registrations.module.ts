import { Module } from "@nestjs/common";

import { PrismaStudentPreRegistrationRepository } from "./repositories/prisma-student-pre-registration.repository";
import { STUDENT_PRE_REGISTRATION_REPOSITORY } from "./student-pre-registrations.constants";
import { StudentPreRegistrationsController } from "./student-pre-registrations.controller";
import { StudentPreRegistrationsService } from "./student-pre-registrations.service";

import { CompaniesModule } from "@/modules/companies/companies.module";

/**
 * Módulo `StudentPreRegistrations` — importa `CompaniesModule` só por
 * `COMPANY_REPOSITORY` (resolver `Company.codigoInterno`, mesma
 * necessidade de `CompanyJoinRequestsModule`). Exporta o repository
 * (não o `Service`) porque quem precisa dele por fora é
 * `StudentsModule`, na hora de `markConcluded` — nunca o contrário
 * (mantém a mesma direção de dependência de `SchoolsModule` em
 * `StudentsModule`).
 */
@Module({
  imports: [CompaniesModule],
  controllers: [StudentPreRegistrationsController],
  providers: [
    StudentPreRegistrationsService,
    {
      provide: STUDENT_PRE_REGISTRATION_REPOSITORY,
      useClass: PrismaStudentPreRegistrationRepository,
    },
  ],
  exports: [STUDENT_PRE_REGISTRATION_REPOSITORY],
})
export class StudentPreRegistrationsModule {}

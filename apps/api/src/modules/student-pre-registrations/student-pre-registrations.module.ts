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
 * (pra `StudentsModule`, na hora de `markConcluded`) E o `Service`
 * agora também (pra `AuthModule` conseguir reivindicar um pré-cadastro
 * dentro de `registerPessoal`, cadastro público via código da
 * transportadora — ver `student-pre-registrations.controller.ts`).
 *
 * O rate limiting de `lookup`/`company-preview` (rotas `@Public()`)
 * continua valendo, mas não é mais configurado aqui: desde 17/09/2026 o
 * `ThrottlerModule` é registrado uma única vez em `app.module.ts` e
 * aplicado a toda a API por um guard global. Os `@Throttle(...)` do
 * controller continuam apertando a faixa `default` rota a rota.
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
  exports: [STUDENT_PRE_REGISTRATION_REPOSITORY, StudentPreRegistrationsService],
})
export class StudentPreRegistrationsModule {}

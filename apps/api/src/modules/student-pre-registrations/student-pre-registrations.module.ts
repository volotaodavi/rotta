import { Module } from "@nestjs/common";
import { ThrottlerModule } from "@nestjs/throttler";

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
 * `ThrottlerModule.forRoot` próprio (mesmo padrão de `AuthModule`, cada
 * módulo com seu próprio guard/storage) porque `lookup`/`company-preview`
 * agora são `@Public()`.
 */
@Module({
  imports: [
    CompaniesModule,
    ThrottlerModule.forRoot({
      throttlers: [{ name: "default", ttl: 60_000, limit: 30 }],
      skipIf: () => process.env.NODE_ENV === "test",
    }),
  ],
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
